import {
  checkSessionStart,
  createSession,
  findActiveSession,
  statusOnSessionStart,
} from './sessions';
import { at, iso, makeSession } from './testing';

describe('session active unique (RG01)', () => {
  const ended = makeSession({ id: 'old', endedAt: iso(30) });

  it('trouve la session sans endedAt', () => {
    const active = makeSession({ id: 'cur', projectId: 'p2' });
    expect(findActiveSession([ended, active])).toBe(active);
    expect(findActiveSession([ended])).toBeUndefined();
    expect(findActiveSession([])).toBeUndefined();
  });

  it('aucune session active → démarrage possible', () => {
    expect(checkSessionStart([ended], 'p1')).toEqual({ kind: 'ok' });
  });

  it('session active sur le même projet → on la reprend', () => {
    const active = makeSession({ projectId: 'p1' });
    expect(checkSessionStart([active], 'p1')).toEqual({ kind: 'resume', session: active });
  });

  it('CA2.2 : session active sur A, démarrer sur B → terminer A d’abord', () => {
    const active = makeSession({ projectId: 'A' });
    expect(checkSessionStart([ended, active], 'B')).toEqual({ kind: 'conflict', session: active });
  });
});

describe('statut au démarrage (RG13)', () => {
  it.each([
    ['todo', 'active'],
    ['paused', 'active'],
    ['active', 'active'],
    ['done', 'done'],
  ] as const)('%s → %s', (status, expected) => {
    expect(statusOnSessionStart(status)).toBe(expected);
  });
});

describe('createSession (CA2.1)', () => {
  it('pose startedAt, lastActivityAt, rowsAtStart et l’état des rappels', () => {
    expect(createSession({ id: 's9', projectId: 'p1', rowCount: 34, now: at(0) })).toEqual({
      id: 's9',
      projectId: 'p1',
      startedAt: iso(0),
      lastActivityAt: iso(0),
      rowsAtStart: 34,
      remindersMode: 'on',
      reminderStage: 0,
    });
  });
});
