import type { Pause, Session } from './types';

/** Instant en millisecondes epoch. `now` est toujours passé en paramètre (section 5). */
export type Instant = number;

export const toInstant = (isoDate: string): Instant => Date.parse(isoDate);
export const toIso = (instant: Instant): string => new Date(instant).toISOString();

export interface SessionTimes {
  sessionMs: number;
  pauseMs: number;
  knitMs: number;
}

type TimedSession = Pick<Session, 'id' | 'startedAt' | 'endedAt' | 'manualKnitSeconds'>;
type TimedPause = Pick<Pause, 'sessionId' | 'startedAt' | 'endedAt'>;

/**
 * RG02 : les trois temps, recalculés depuis les horodatages.
 * Une session terminée s'arrête à `endedAt` ; une pause ouverte court jusqu'à la fin (RG03),
 * ce qui fige le temps de tricot pendant la pause (RG04).
 */
export function sessionTimes(
  session: TimedSession,
  pauses: readonly TimedPause[],
  now: Instant,
): SessionTimes {
  const start = toInstant(session.startedAt);
  const end = session.endedAt ? toInstant(session.endedAt) : now;
  const sessionMs = Math.max(0, end - start);

  const pauseMs = pauses
    .filter((p) => p.sessionId === session.id)
    .reduce((sum, p) => {
      const pauseEnd = Math.min(p.endedAt ? toInstant(p.endedAt) : end, end);
      const pauseStart = Math.max(toInstant(p.startedAt), start);
      return sum + Math.max(0, pauseEnd - pauseStart);
    }, 0);

  const knitMs =
    session.manualKnitSeconds !== undefined
      ? session.manualKnitSeconds * 1000
      : Math.max(0, sessionMs - pauseMs);

  return { sessionMs, pauseMs: Math.min(pauseMs, sessionMs), knitMs };
}
