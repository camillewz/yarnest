import { toInstant, toIso, type Instant } from './time';
import type { Pause, Session } from './types';

/** RG10 : délai d'inactivité au-delà duquel une session ouverte est clôturée. */
export const AUTO_CLOSE_AFTER_MS = 12 * 60 * 60_000;

export interface AutoClosePlan {
  sessionPatch: Required<Pick<Session, 'endedAt' | 'endReason'>>;
  pausePatches: { id: string; endedAt: string }[];
}

/**
 * RG10 : à l'ouverture puis chaque minute. Une session sans action depuis 12 h (pile comprise)
 * est fermée à `lastActivityAt`, et sa pause ouverte à la même heure.
 */
export function autoClosePlan(
  session: Pick<Session, 'id' | 'endedAt' | 'lastActivityAt'>,
  pauses: readonly Pick<Pause, 'id' | 'sessionId' | 'startedAt' | 'endedAt'>[],
  now: Instant,
): AutoClosePlan | null {
  if (session.endedAt) return null;
  const lastActivity = toInstant(session.lastActivityAt);
  if (now - lastActivity < AUTO_CLOSE_AFTER_MS) return null;

  return {
    sessionPatch: { endedAt: session.lastActivityAt, endReason: 'auto12h' },
    pausePatches: pauses
      .filter((p) => p.sessionId === session.id && !p.endedAt)
      .map((p) => ({ id: p.id, endedAt: toIso(Math.max(lastActivity, toInstant(p.startedAt))) })),
  };
}
