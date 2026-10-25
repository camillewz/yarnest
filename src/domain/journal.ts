import { rowsDone } from './counters';
import { sessionTimes, toInstant, type SessionTimes } from './time';
import type { Pause, Review, Session } from './types';

export interface JournalEntry {
  session: Session;
  times: SessionTimes;
  pauseCount: number;
  /** RG12 ; absent pour une session sans `rowsAtEnd`. */
  rowsDone?: number;
  review?: Review;
}

export interface Journal {
  entries: JournalEntry[];
  totalKnitMs: number;
}

/** US6.1 : sessions terminées d'un projet, de la plus récente à la plus ancienne. */
export function journal(
  sessions: readonly Session[],
  pauses: readonly Pause[],
  reviews: readonly Review[],
): Journal {
  const entries = sessions
    .filter((s) => s.endedAt)
    .sort((a, b) => toInstant(b.startedAt) - toInstant(a.startedAt))
    .map((session): JournalEntry => {
      const own = pauses.filter((p) => p.sessionId === session.id);
      return {
        session,
        // Session terminée : `now` est ignoré au profit de endedAt (RG02).
        times: sessionTimes(session, own, toInstant(session.endedAt ?? session.startedAt)),
        pauseCount: own.length,
        ...(session.rowsAtEnd === undefined
          ? {}
          : { rowsDone: rowsDone(session.rowsAtStart, session.rowsAtEnd) }),
        ...withReview(reviews.find((r) => r.sessionId === session.id)),
      };
    });
  return { entries, totalKnitMs: entries.reduce((sum, e) => sum + e.times.knitMs, 0) };
}

const withReview = (review: Review | undefined) => (review ? { review } : {});
