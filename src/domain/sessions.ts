import { toIso, type Instant } from './time';
import type { ProjectStatus, Session } from './types';

export function findActiveSession<S extends Pick<Session, 'endedAt'>>(
  sessions: readonly S[],
): S | undefined {
  return sessions.find((s) => !s.endedAt);
}

export type SessionStartCheck<S> =
  { kind: 'ok' } | { kind: 'resume'; session: S } | { kind: 'conflict'; session: S };

/** RG01 : une seule session ouverte, tous projets confondus. */
export function checkSessionStart<S extends Pick<Session, 'projectId' | 'endedAt'>>(
  sessions: readonly S[],
  projectId: string,
): SessionStartCheck<S> {
  const active = findActiveSession(sessions);
  if (!active) return { kind: 'ok' };
  return active.projectId === projectId
    ? { kind: 'resume', session: active }
    : { kind: 'conflict', session: active };
}

/** RG13 : « À faire » et « En pause » passent « En cours » ; « Terminé » est conservé. */
export function statusOnSessionStart(status: ProjectStatus): ProjectStatus {
  return status === 'todo' || status === 'paused' ? 'active' : status;
}

export function createSession(input: {
  id: string;
  projectId: string;
  rowCount: number;
  now: Instant;
}): Session {
  const now = toIso(input.now);
  return {
    id: input.id,
    projectId: input.projectId,
    startedAt: now,
    lastActivityAt: now,
    rowsAtStart: input.rowCount,
    remindersMode: 'on',
    reminderStage: 0,
  };
}
