import { sessionTimes, toInstant } from '../../domain/time';
import type { Pause, Session } from '../../domain/types';

/** Dernière session d'un projet et son temps de tricot (cartes E1). */
export function lastSessionOf(
  projectId: string,
  sessions: readonly Session[],
  pauses: readonly Pause[],
  now: number,
): { session: Session; knitMs: number } | undefined {
  const last = sessions
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => toInstant(b.startedAt) - toInstant(a.startedAt))[0];
  if (!last) return undefined;
  return { session: last, knitMs: sessionTimes(last, pauses, now).knitMs };
}
