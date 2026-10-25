import { HOUR, MIN, at, iso, makePause, makeSession } from './testing';
import { sessionTimes, toInstant, toIso } from './time';

describe('toInstant / toIso', () => {
  it('convertit un ISO 8601 UTC en millisecondes et inversement', () => {
    expect(toInstant('2026-10-25T10:00:00.000Z')).toBe(at(0));
    expect(toIso(at(90))).toBe('2026-10-25T11:30:00.000Z');
  });
});

describe('sessionTimes (RG02, RG03, RG04)', () => {
  it('CA2.3 : 10 min de session dont 3 min de pause → tricot 7, pause 3, session 10', () => {
    const times = sessionTimes(makeSession(), [makePause(4, 7)], at(10));
    expect(times).toEqual({ sessionMs: 10 * MIN, pauseMs: 3 * MIN, knitMs: 7 * MIN });
  });

  it('additionne plusieurs pauses', () => {
    const times = sessionTimes(makeSession(), [makePause(10, 15), makePause(30, 32)], at(60));
    expect(times.pauseMs).toBe(7 * MIN);
    expect(times.knitMs).toBe(53 * MIN);
  });

  it('RG04 : pendant une pause ouverte, le temps de tricot est figé', () => {
    const pauses = [makePause(7)];
    expect(sessionTimes(makeSession(), pauses, at(7)).knitMs).toBe(7 * MIN);
    expect(sessionTimes(makeSession(), pauses, at(9)).knitMs).toBe(7 * MIN);
    expect(sessionTimes(makeSession(), pauses, at(30)).knitMs).toBe(7 * MIN);
  });

  it('RG03 : une pause de 5 min dépassée sans endedAt compte entièrement en pause', () => {
    const times = sessionTimes(makeSession(), [makePause(10)], at(18));
    expect(times.pauseMs).toBe(8 * MIN);
    expect(times.knitMs).toBe(10 * MIN);
  });

  it('CA2.4 : recalcul exact depuis les horodatages, 60 min plus tard', () => {
    const times = sessionTimes(makeSession(), [], at(60));
    expect(times).toEqual({ sessionMs: HOUR, pauseMs: 0, knitMs: HOUR });
  });

  it('RG02 : session terminée → now vaut endedAt', () => {
    const session = makeSession({ endedAt: iso(50) });
    const times = sessionTimes(session, [makePause(20, 30)], at(500));
    expect(times).toEqual({ sessionMs: 50 * MIN, pauseMs: 10 * MIN, knitMs: 40 * MIN });
  });

  it('borne une pause restée ouverte à la fin de la session', () => {
    const session = makeSession({ endedAt: iso(50) });
    expect(sessionTimes(session, [makePause(40)], at(500)).pauseMs).toBe(10 * MIN);
  });

  it('ignore les pauses d’une autre session', () => {
    const other = makePause(2, 8, { sessionId: 's2' });
    expect(sessionTimes(makeSession(), [other], at(10)).pauseMs).toBe(0);
  });

  it('US6.2 : manualKnitSeconds remplace le temps de tricot calculé', () => {
    const session = makeSession({ endedAt: iso(80), manualKnitSeconds: 45 * 60 });
    const times = sessionTimes(session, [makePause(10, 20)], at(80));
    expect(times.knitMs).toBe(45 * MIN);
    expect(times.sessionMs).toBe(80 * MIN);
    expect(times.pauseMs).toBe(10 * MIN);
  });

  it('accepte manualKnitSeconds = 0', () => {
    const session = makeSession({ endedAt: iso(30), manualKnitSeconds: 0 });
    expect(sessionTimes(session, [], at(30)).knitMs).toBe(0);
  });

  it('horloge antérieure au début (fuseau, horloge corrigée) → aucun temps négatif', () => {
    const times = sessionTimes(makeSession(), [makePause(0)], at(-5));
    expect(times).toEqual({ sessionMs: 0, pauseMs: 0, knitMs: 0 });
  });

  it('pauses incohérentes (plus longues que la session) → tricot plancher à 0', () => {
    const odd = makePause(-10, 5);
    const times = sessionTimes(makeSession(), [odd], at(5));
    expect(times.pauseMs).toBe(5 * MIN);
    expect(times.knitMs).toBe(0);
  });
});
