import { AUTO_CLOSE_AFTER_MS, autoClosePlan } from './autoclose';
import { HOUR, MIN, at, iso, makePause, makeSession } from './testing';

const T = 90; // dernière action à T0 + 90 min
const session = makeSession({ lastActivityAt: iso(T) });

describe('clôture automatique (RG10)', () => {
  it('délai de 12 h', () => {
    expect(AUTO_CLOSE_AFTER_MS).toBe(12 * HOUR);
  });

  it('CA2.6 : dernière action à T, ouverture à T + 12 h 01 → fermée à T, auto12h', () => {
    expect(autoClosePlan(session, [], at(T) + 12 * HOUR + MIN)).toEqual({
      sessionPatch: { endedAt: iso(T), endReason: 'auto12h' },
      pausePatches: [],
    });
  });

  it('à 12 h pile → fermée', () => {
    expect(autoClosePlan(session, [], at(T) + 12 * HOUR)).not.toBeNull();
  });

  it('à 11 h 59 → laissée ouverte', () => {
    expect(autoClosePlan(session, [], at(T) + 12 * HOUR - MIN)).toBeNull();
  });

  it('session longue mais active → laissée ouverte', () => {
    const active = makeSession({ lastActivityAt: iso(13 * 60 - 1) });
    expect(autoClosePlan(active, [], at(13 * 60))).toBeNull();
  });

  it('session déjà terminée → rien', () => {
    const ended = makeSession({ endedAt: iso(T), lastActivityAt: iso(T) });
    expect(autoClosePlan(ended, [], at(T) + 20 * HOUR)).toBeNull();
  });

  it('pause ouverte fermée à la même heure ; pauses closes et autres sessions intactes', () => {
    const open = makePause(T - 10);
    const closed = makePause(10, 15);
    const other = makePause(T - 10, undefined, { id: 'other', sessionId: 's2' });
    expect(autoClosePlan(session, [closed, open, other], at(T) + 13 * HOUR)).toEqual({
      sessionPatch: { endedAt: iso(T), endReason: 'auto12h' },
      pausePatches: [{ id: open.id, endedAt: iso(T) }],
    });
  });

  it('pause ouverte après la dernière action → fermée à son début, jamais avant', () => {
    const late = makePause(T + 5);
    expect(autoClosePlan(session, [late], at(T) + 13 * HOUR)?.pausePatches).toEqual([
      { id: late.id, endedAt: iso(T + 5) },
    ]);
  });
});
