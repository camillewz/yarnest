// Écritures transactionnelles : une fonction par action utilisateur (docs/SPEC.md, section 4).
// Chaque fonction ouvre une transaction Dexie, écrit l'action et met à jour project.updatedAt
// et, en session, session.lastActivityAt. `now` est passé par l'appelant (horloge de l'UI).
import { autoClosePlan } from '../domain/autoclose';
import * as counters from '../domain/counters';
import { canStartPause, createPause, findOpenPause } from '../domain/pauses';
import {
  pauseStartedReminderPatch,
  reminderChoicePatch,
  reminderShownPatch,
  type ReminderStage,
} from '../domain/reminders';
import {
  checkSessionStart,
  createSession,
  findActiveSession,
  statusOnSessionStart,
  type SessionStartCheck,
} from '../domain/sessions';
import { toIso, type Instant } from '../domain/time';
import type {
  BodyZone,
  CounterReminder,
  Project,
  ProjectStatus,
  Review,
  Session,
  Technique,
} from '../domain/types';
import { db, type SettingKey, type SettingsMap } from './schema';

export const NAME_MAX = 60;
export const NOTE_MAX = 500;

const newId = () => crypto.randomUUID();

export class RepoError extends Error {}

async function getProject(id: string): Promise<Project> {
  const project = await db.projects.get(id);
  if (!project) throw new RepoError(`Projet introuvable : ${id}`);
  return project;
}

async function getSession(id: string): Promise<Session> {
  const session = await db.sessions.get(id);
  if (!session) throw new RepoError(`Session introuvable : ${id}`);
  return session;
}

async function activeSession(): Promise<Session | undefined> {
  return findActiveSession(await db.sessions.filter((s) => !s.endedAt).toArray());
}

/** Marque l'activité : projet (tri E1) et session active de ce projet le cas échéant. */
async function touch(projectId: string, now: Instant) {
  const at = toIso(now);
  await db.projects.update(projectId, { updatedAt: at });
  const active = await activeSession();
  if (active?.projectId === projectId) await db.sessions.update(active.id, { lastActivityAt: at });
}

function cleanText(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim().slice(0, max);
  return trimmed ? trimmed : undefined;
}

// --- Projets (US1.x) ---

export interface ProjectInput {
  name: string;
  technique?: Technique;
  note?: string;
}

export async function createProject(input: ProjectInput, now: Instant): Promise<string> {
  const name = cleanText(input.name, NAME_MAX);
  if (!name) throw new RepoError('Le nom est obligatoire');
  const at = toIso(now);
  const project: Project = {
    id: newId(),
    name,
    status: 'todo',
    rowCount: 0,
    stitchCount: 0,
    createdAt: at,
    updatedAt: at,
  };
  const note = cleanText(input.note, NOTE_MAX);
  if (input.technique) project.technique = input.technique;
  if (note) project.note = note;
  await db.projects.add(project);
  return project.id;
}

export async function updateProject(
  id: string,
  input: ProjectInput & { status?: ProjectStatus },
  now: Instant,
): Promise<void> {
  const name = cleanText(input.name, NAME_MAX);
  if (!name) throw new RepoError('Le nom est obligatoire');
  await db.transaction('rw', db.projects, db.sessions, async () => {
    const project = await getProject(id);
    const next: Project = { ...project, name, updatedAt: toIso(now) };
    const note = cleanText(input.note, NOTE_MAX);
    if (input.technique) next.technique = input.technique;
    else delete next.technique;
    if (note) next.note = note;
    else delete next.note;
    if (input.status) next.status = input.status;
    await db.projects.put(next);
    await touch(id, now);
  });
}

/** US1.3 : changement de statut, enregistré sans bouton. */
export async function setProjectStatus(id: string, status: ProjectStatus, now: Instant) {
  await db.transaction('rw', db.projects, db.sessions, async () => {
    await getProject(id);
    await db.projects.update(id, { status });
    await touch(id, now);
  });
}

/** RG14 : suppression en cascade, dans une seule transaction. */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.projects, db.sessions, db.pauses, db.reviews, db.counterReminders, db.settings],
    async () => {
      const sessionIds = (await db.sessions
        .where('projectId')
        .equals(id)
        .primaryKeys()) as string[];
      await db.pauses.where('sessionId').anyOf(sessionIds).delete();
      await db.reviews.bulkDelete(sessionIds);
      await db.sessions.bulkDelete(sessionIds);
      await db.counterReminders.where('projectId').equals(id).delete();
      await db.projects.delete(id);
      const pending = await db.settings.get('pendingReviewSessionId');
      if (pending && sessionIds.includes(pending.value as string)) {
        await db.settings.delete('pendingReviewSessionId');
      }
    },
  );
}

// --- Compteurs (US4.x, RG11) ---

export type CounterAction = Exclude<keyof typeof counters, 'rowsDone'>;

/** Une transaction par tap : 20 taps rapides donnent exactement +20 (CA4.5). */
export async function applyCounter(projectId: string, action: CounterAction, now: Instant) {
  await db.transaction('rw', db.projects, db.sessions, async () => {
    const project = await getProject(projectId);
    const next = counters[action](project);
    await db.projects.update(projectId, next);
    await touch(projectId, now);
  });
}

// --- Sessions (US2.x, RG01, RG13) ---

export async function startSession(
  projectId: string,
  now: Instant,
): Promise<SessionStartCheck<Session> & { sessionId?: string }> {
  return db.transaction('rw', db.projects, db.sessions, async () => {
    const project = await getProject(projectId);
    const check = checkSessionStart(
      await db.sessions.filter((s) => !s.endedAt).toArray(),
      projectId,
    );
    if (check.kind !== 'ok') return check;
    const session = createSession({ id: newId(), projectId, rowCount: project.rowCount, now });
    await db.sessions.add(session);
    await db.projects.update(projectId, {
      status: statusOnSessionStart(project.status),
      updatedAt: toIso(now),
    });
    return { kind: 'ok' as const, sessionId: session.id };
  });
}

/** Termine la session : endedAt, rangs de fin, pause ouverte close à la même heure. */
export async function endSession(sessionId: string, now: Instant): Promise<void> {
  await db.transaction('rw', db.projects, db.sessions, db.pauses, async () => {
    const session = await getSession(sessionId);
    if (session.endedAt) return;
    const project = await getProject(session.projectId);
    const at = toIso(now);
    const open = await db.pauses
      .where('sessionId')
      .equals(sessionId)
      .filter((p) => !p.endedAt)
      .first();
    if (open) await db.pauses.update(open.id, { endedAt: at });
    await db.sessions.update(sessionId, {
      endedAt: at,
      endReason: 'manual',
      lastActivityAt: at,
      rowsAtEnd: project.rowCount,
    });
    await db.projects.update(project.id, { updatedAt: at });
  });
}

/** RG10 : à l'ouverture puis chaque minute. Renvoie l'id de la session clôturée, s'il y en a une. */
export async function runAutoClose(now: Instant): Promise<string | undefined> {
  return db.transaction('rw', [db.projects, db.sessions, db.pauses, db.settings], async () => {
    const session = await activeSession();
    if (!session) return undefined;
    const pauses = await db.pauses.where('sessionId').equals(session.id).toArray();
    const plan = autoClosePlan(session, pauses, now);
    if (!plan) return undefined;
    const project = await db.projects.get(session.projectId);
    for (const p of plan.pausePatches) await db.pauses.update(p.id, { endedAt: p.endedAt });
    await db.sessions.update(session.id, {
      ...plan.sessionPatch,
      ...(project ? { rowsAtEnd: project.rowCount } : {}),
    });
    await db.settings.put({ key: 'pendingReviewSessionId', value: session.id });
    return session.id;
  });
}

/** US6.2 : correction manuelle du temps de tricot. */
export async function setManualKnitTime(sessionId: string, seconds: number): Promise<void> {
  await db.sessions.update(sessionId, { manualKnitSeconds: Math.max(0, Math.round(seconds)) });
}

/** CA6.3 : suppression d'une session, de ses pauses et de son bilan. */
export async function deleteSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.pauses, db.reviews, db.settings, async () => {
    await db.pauses.where('sessionId').equals(sessionId).delete();
    await db.reviews.delete(sessionId);
    await db.sessions.delete(sessionId);
    const pending = await db.settings.get('pendingReviewSessionId');
    if (pending?.value === sessionId) await db.settings.delete('pendingReviewSessionId');
  });
}

// --- Pauses (US3.1, US3.2, RG04, RG08) ---

export async function startPause(sessionId: string, minutes: number, now: Instant) {
  await db.transaction('rw', db.projects, db.sessions, db.pauses, async () => {
    const session = await getSession(sessionId);
    const pauses = await db.pauses.where('sessionId').equals(sessionId).toArray();
    if (!canStartPause(session, pauses)) return;
    await db.pauses.add(createPause({ id: newId(), sessionId, minutes, now }));
    await db.sessions.update(sessionId, {
      ...pauseStartedReminderPatch(),
      lastActivityAt: toIso(now),
    });
    await db.projects.update(session.projectId, { updatedAt: toIso(now) });
  });
}

/** « Reprendre » ou « Arrêter la pause ». */
export async function endPause(sessionId: string, now: Instant) {
  await db.transaction('rw', db.projects, db.sessions, db.pauses, async () => {
    const session = await getSession(sessionId);
    const open = findOpenPause(
      await db.pauses.where('sessionId').equals(sessionId).toArray(),
      sessionId,
    );
    if (!open) return;
    await db.pauses.update(open.id, { endedAt: toIso(now) });
    await db.sessions.update(sessionId, { lastActivityAt: toIso(now) });
    await db.projects.update(session.projectId, { updatedAt: toIso(now) });
  });
}

// --- Rappels (US3.3, RG06 à RG08) ---

export async function markReminderShown(sessionId: string, stage: ReminderStage, now: Instant) {
  await db.sessions.update(sessionId, reminderShownPatch(stage, now));
}

export async function chooseAfterR3(sessionId: string, choice: 'continue' | 'stop') {
  await db.sessions.update(sessionId, reminderChoicePatch(choice));
}

// --- Bilan (US5.1) ---

export interface ReviewInput {
  mood?: Review['mood'];
  zones: BodyZone[];
  note?: string;
}

export async function saveReview(sessionId: string, input: ReviewInput, now: Instant) {
  await db.transaction('rw', db.reviews, db.settings, async () => {
    const existing = await db.reviews.get(sessionId);
    const review: Review = {
      sessionId,
      zones: input.zones,
      createdAt: existing?.createdAt ?? toIso(now),
    };
    const note = cleanText(input.note, NOTE_MAX);
    if (input.mood) review.mood = input.mood;
    if (note) review.note = note;
    await db.reviews.put(review);
    await clearPendingReview(sessionId);
  });
}

/** « Passer » : la session reste au journal, sans bilan. */
export async function skipReview(sessionId: string) {
  await db.transaction('rw', db.settings, () => clearPendingReview(sessionId));
}

async function clearPendingReview(sessionId: string) {
  const pending = await db.settings.get('pendingReviewSessionId');
  if (pending?.value === sessionId) await db.settings.delete('pendingReviewSessionId');
}

// --- Rappels de compteur (Should have) ---

export async function addCounterReminder(
  input: Omit<CounterReminder, 'id' | 'doneAt'>,
): Promise<string> {
  const reminder: CounterReminder = {
    id: newId(),
    projectId: input.projectId,
    atRow: Math.max(0, Math.round(input.atRow)),
    kind: input.kind,
  };
  const label = cleanText(input.label, NAME_MAX);
  if (label) reminder.label = label;
  await db.counterReminders.add(reminder);
  return reminder.id;
}

export async function markCounterReminderDone(id: string, now: Instant) {
  await db.counterReminders.update(id, { doneAt: toIso(now) });
}

export async function deleteCounterReminder(id: string) {
  await db.counterReminders.delete(id);
}

// --- Réglages ---

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingsMap[K] | undefined> {
  return (await db.settings.get(key))?.value as SettingsMap[K] | undefined;
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingsMap[K]) {
  await db.settings.put({ key, value });
}
