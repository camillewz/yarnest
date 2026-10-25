import {
  DEFAULT_PAUSE_MINUTES,
  MAX_PAUSE_MINUTES,
  MIN_PAUSE_MINUTES,
  canStartPause,
  createPause,
  findOpenPause,
  normalizePauseMinutes,
  pauseCountdown,
  stepPauseMinutes,
} from './pauses';
import { MIN, at, iso, makePause, makeSession } from './testing';

describe('durée de pause (RG05, CA3.1)', () => {
  it('5 min par défaut, bornes 5 et 60', () => {
    expect(DEFAULT_PAUSE_MINUTES).toBe(5);
    expect(MIN_PAUSE_MINUTES).toBe(5);
    expect(MAX_PAUSE_MINUTES).toBe(60);
  });

  it.each([
    [5, 1, 10],
    [55, 1, 60],
    [60, 1, 60],
    [10, -1, 5],
    [5, -1, 5],
  ] as const)('%i min, pas %i → %i min', (current, direction, expected) => {
    expect(stepPauseMinutes(current, direction)).toBe(expected);
  });

  it('12 taps sur + depuis 5 → 60, jamais au-delà', () => {
    let minutes = DEFAULT_PAUSE_MINUTES;
    for (let i = 0; i < 12; i++) minutes = stepPauseMinutes(minutes, 1);
    expect(minutes).toBe(60);
  });

  it.each([
    [7, 5],
    [8, 10],
    [0, 5],
    [-20, 5],
    [99, 60],
    [Number.NaN, 5],
    [Number.POSITIVE_INFINITY, 5],
  ])('normalise %d en %d', (input, expected) => {
    expect(normalizePauseMinutes(input)).toBe(expected);
  });

  it('un pas appliqué à une valeur hors palier la ramène sur la grille', () => {
    expect(stepPauseMinutes(7, 1)).toBe(10);
  });
});

describe('pause ouverte (RG04)', () => {
  it('trouve la pause sans endedAt de la session', () => {
    const open = makePause(20);
    expect(findOpenPause([makePause(5, 10), open], 's1')).toBe(open);
    expect(findOpenPause([makePause(5, 10)], 's1')).toBeUndefined();
    expect(findOpenPause([makePause(5, undefined, { sessionId: 's2' })], 's1')).toBeUndefined();
  });

  it('une seule pause ouverte par session', () => {
    expect(canStartPause(makeSession(), [makePause(5, 10)])).toBe(true);
    expect(canStartPause(makeSession(), [makePause(20)])).toBe(false);
  });

  it('pas de pause sur une session terminée', () => {
    expect(canStartPause(makeSession({ endedAt: iso(30) }), [])).toBe(false);
  });

  it('crée une pause ouverte, durée normalisée', () => {
    expect(createPause({ id: 'x', sessionId: 's1', minutes: 15, now: at(42) })).toEqual({
      id: 'x',
      sessionId: 's1',
      startedAt: iso(42),
      plannedMinutes: 15,
    });
    expect(createPause({ id: 'y', sessionId: 's1', minutes: 90, now: at(0) }).plannedMinutes).toBe(
      60,
    );
  });
});

describe('pauseCountdown (US3.2, RG03)', () => {
  it('compte à rebours en cours : 04:12 restantes', () => {
    expect(pauseCountdown(makePause(0), at(0) + 48_000)).toEqual({
      remainingMs: 4 * MIN + 12_000,
      overrunMs: 0,
      finished: false,
    });
  });

  it('terminée pile à la durée prévue', () => {
    expect(pauseCountdown(makePause(0), at(5))).toEqual({
      remainingMs: 0,
      overrunMs: 0,
      finished: true,
    });
  });

  it('CA3.4 : pause de 5 min, retour après 8 min → terminée il y a 3 min', () => {
    expect(pauseCountdown(makePause(0), at(8))).toEqual({
      remainingMs: 0,
      overrunMs: 3 * MIN,
      finished: true,
    });
  });

  it('pause close : calcul arrêté à endedAt', () => {
    expect(pauseCountdown(makePause(0, 2), at(30))).toEqual({
      remainingMs: 3 * MIN,
      overrunMs: 0,
      finished: false,
    });
  });

  it('horloge antérieure au début → durée prévue entière', () => {
    expect(pauseCountdown(makePause(10), at(9)).remainingMs).toBe(5 * MIN);
  });
});
