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
