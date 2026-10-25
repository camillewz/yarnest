import { toInstant, toIso, type Instant } from './time';
import type { Pause, Session } from './types';

// RG05 : de 5 à 60 min par paliers de 5, 5 min par défaut.
export const MIN_PAUSE_MINUTES = 5;
export const MAX_PAUSE_MINUTES = 60;
export const PAUSE_STEP_MINUTES = 5;
export const DEFAULT_PAUSE_MINUTES = 5;

/** Ramène une durée quelconque sur la grille 5…60 (palier le plus proche). */
export function normalizePauseMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_PAUSE_MINUTES;
  const snapped = Math.round(minutes / PAUSE_STEP_MINUTES) * PAUSE_STEP_MINUTES;
  return Math.min(MAX_PAUSE_MINUTES, Math.max(MIN_PAUSE_MINUTES, snapped));
}

/** Boutons + et − de la feuille de pause. */
export function stepPauseMinutes(minutes: number, direction: 1 | -1): number {
  return normalizePauseMinutes(normalizePauseMinutes(minutes) + direction * PAUSE_STEP_MINUTES);
}

export function findOpenPause<P extends Pick<Pause, 'sessionId' | 'endedAt'>>(
  pauses: readonly P[],
  sessionId: string,
): P | undefined {
  return pauses.find((p) => p.sessionId === sessionId && !p.endedAt);
}

/** RG04 : une seule pause ouverte par session, et seulement sur une session en cours. */
export function canStartPause(
  session: Pick<Session, 'id' | 'endedAt'>,
  pauses: readonly Pick<Pause, 'sessionId' | 'endedAt'>[],
): boolean {
  return !session.endedAt && !findOpenPause(pauses, session.id);
}

export function createPause(input: {
  id: string;
  sessionId: string;
  minutes: number;
  now: Instant;
}): Pause {
  return {
    id: input.id,
    sessionId: input.sessionId,
    startedAt: toIso(input.now),
    plannedMinutes: normalizePauseMinutes(input.minutes),
  };
}

export interface PauseCountdown {
  remainingMs: number;
  /** Temps écoulé depuis la fin prévue (« terminée il y a 3 min »), compté en pause (RG03). */
  overrunMs: number;
  finished: boolean;
}

export function pauseCountdown(
  pause: Pick<Pause, 'startedAt' | 'plannedMinutes' | 'endedAt'>,
  now: Instant,
): PauseCountdown {
  const start = toInstant(pause.startedAt);
  const end = pause.endedAt ? Math.min(toInstant(pause.endedAt), now) : now;
  const elapsed = Math.max(0, end - start);
  const planned = pause.plannedMinutes * 60_000;
  return {
    remainingMs: Math.max(0, planned - elapsed),
    overrunMs: Math.max(0, elapsed - planned),
    finished: elapsed >= planned,
  };
}
