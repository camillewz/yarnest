import { toInstant, toIso, type Instant } from './time';
import type { Pause, Session } from './types';

export type ReminderStage = 1 | 2 | 3;

// RG06 : paliers R1, R2, R3, en minutes de tricot continu.
export const REMINDER_THRESHOLDS_MIN: Record<ReminderStage, number> = { 1: 30, 2: 60, 3: 120 };
// RG07 : après « Continuer de me le rappeler », un R3 toutes les 30 min.
export const REPEAT_INTERVAL_MIN = 30;

const MIN = 60_000;

/**
 * RG06 : début du tricot continu = fin de la dernière pause, sinon début de session.
 * `null` pendant une pause ouverte.
 */
export function continuousKnitStart(
  session: Pick<Session, 'id' | 'startedAt'>,
  pauses: readonly Pick<Pause, 'sessionId' | 'endedAt'>[],
): Instant | null {
  let start = toInstant(session.startedAt);
  for (const p of pauses) {
    if (p.sessionId !== session.id) continue;
    if (!p.endedAt) return null;
    start = Math.max(start, toInstant(p.endedAt));
  }
  return start;
}

export interface DueReminderInput {
  session: Pick<
    Session,
    'id' | 'startedAt' | 'endedAt' | 'remindersMode' | 'reminderStage' | 'lastReminderAt'
  >;
  pauses: readonly Pick<Pause, 'sessionId' | 'endedAt'>[];
  remindersEnabled: boolean;
  now: Instant;
}

/** Rappel à afficher maintenant, ou `null`. Seul le palier le plus élevé est rendu (RG09). */
export function dueReminder({
  session,
  pauses,
  remindersEnabled,
  now,
}: DueReminderInput): ReminderStage | null {
  if (!remindersEnabled || session.endedAt || session.remindersMode === 'off') return null;

  const start = continuousKnitStart(session, pauses);
  if (start === null) return null;

  if (session.reminderStage === 3) {
    if (session.remindersMode !== 'every30') return null;
    const last = session.lastReminderAt ? toInstant(session.lastReminderAt) : start;
    return now - Math.max(last, start) >= REPEAT_INTERVAL_MIN * MIN ? 3 : null;
  }

  const elapsedMin = (now - start) / MIN;
  const reached = ([3, 2, 1] as const).find((s) => elapsedMin >= REMINDER_THRESHOLDS_MIN[s]);
  return reached !== undefined && reached > session.reminderStage ? reached : null;
}

/** À écrire dès qu'un rappel s'affiche, pour qu'il ne revienne pas après un rechargement. */
export function reminderShownPatch(
  stage: ReminderStage,
  now: Instant,
): Pick<Session, 'reminderStage' | 'lastReminderAt'> {
  return { reminderStage: stage, lastReminderAt: toIso(now) };
}

/** RG07 : choix proposés par R3. */
export function reminderChoicePatch(choice: 'continue' | 'stop'): Pick<Session, 'remindersMode'> {
  return { remindersMode: choice === 'continue' ? 'every30' : 'off' };
}

/** RG08 : une pause remet le palier à 0 sans réactiver un mode `off`. */
export function pauseStartedReminderPatch(): Pick<Session, 'reminderStage'> {
  return { reminderStage: 0 };
}

/** Durée de tricot continu annoncée : le palier pour R1 et R2, la demi-heure entamée pour R3. */
export function reminderMinutes(
  stage: ReminderStage,
  now: Instant,
  continuousStart: Instant,
): number {
  if (stage < 3) return REMINDER_THRESHOLDS_MIN[stage];
  const elapsed = Math.floor((now - continuousStart) / MIN);
  return Math.max(
    REMINDER_THRESHOLDS_MIN[3],
    Math.floor(elapsed / REPEAT_INTERVAL_MIN) * REPEAT_INTERVAL_MIN,
  );
}

export interface PauseRing {
  /** Part du tour en cours, de 0 à 1. */
  progress: number;
  /** Temps restant avant la fin du tour. */
  remainingMs: number;
  /** `true` si un rappel de pause est attendu au bout du tour. */
  reminder: boolean;
}

/**
 * Anneau de E4 : avance vers le prochain rappel (30 min, 1 h, 2 h, puis toutes les 30 min
 * après « Continuer »). Sans rappel à venir, il fait des tours de 30 min. `null` pendant une pause.
 */
export function pauseRing({
  session,
  pauses,
  remindersEnabled,
  now,
}: DueReminderInput): PauseRing | null {
  if (session.endedAt) return null;
  const start = continuousKnitStart(session, pauses);
  if (start === null) return null;
  const elapsed = Math.max(0, now - start);
  const active = remindersEnabled && session.remindersMode !== 'off';

  const span = (from: Instant, to: Instant, reminder: boolean): PauseRing => ({
    progress: Math.min(1, Math.max(0, (now - from) / (to - from))),
    remainingMs: Math.max(0, to - now),
    reminder,
  });

  if (active && session.reminderStage === 3 && session.remindersMode === 'every30') {
    const last = Math.max(session.lastReminderAt ? toInstant(session.lastReminderAt) : start, start);
    return span(last, last + REPEAT_INTERVAL_MIN * MIN, true);
  }
  if (active && session.reminderStage < 3) {
    const thresholds = [0, ...([1, 2, 3] as const).map((s) => REMINDER_THRESHOLDS_MIN[s] * MIN)];
    const next = thresholds.findIndex((t) => t > elapsed);
    if (next === -1) return { progress: 1, remainingMs: 0, reminder: true };
    return span(start + (thresholds[next - 1] ?? 0), start + (thresholds[next] ?? 0), true);
  }
  const lap = REPEAT_INTERVAL_MIN * MIN;
  const from = start + Math.floor(elapsed / lap) * lap;
  return span(from, from + lap, false);
}
