// Outils de test du domaine : instants exprimés en minutes depuis une origine fixe.
import type { Pause, Session } from './types';

export const T0 = Date.parse('2026-10-25T10:00:00.000Z');
export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** Instant à `minutes` de T0, en millisecondes epoch. */
export const at = (minutes: number) => T0 + minutes * MIN;
/** Même instant en ISO 8601 UTC, tel que stocké dans IndexedDB. */
export const iso = (minutes: number) => new Date(at(minutes)).toISOString();

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    projectId: 'p1',
    startedAt: iso(0),
    lastActivityAt: iso(0),
    rowsAtStart: 0,
    remindersMode: 'on',
    reminderStage: 0,
    ...overrides,
  };
}

export function makePause(
  startMin: number,
  endMin?: number,
  overrides: Partial<Pause> = {},
): Pause {
  return {
    id: `pause-${startMin}`,
    sessionId: 's1',
    startedAt: iso(startMin),
    plannedMinutes: 5,
    ...(endMin === undefined ? {} : { endedAt: iso(endMin) }),
    ...overrides,
  };
}
