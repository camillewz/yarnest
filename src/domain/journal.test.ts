import { journal, knitByDay } from './journal';
import { HOUR, MIN, at, iso, makePause, makeSession } from './testing';
import type { Review } from './types';

const ended = (id: string, start: number, end: number, extra = {}) =>
  makeSession({ id, startedAt: iso(start), endedAt: iso(end), rowsAtStart: 10, ...extra });

describe('journal (US6.1, US6.2)', () => {
  const s1 = ended('a', 0, 60, { rowsAtEnd: 22 });
  const s2 = ended('b', 24 * 60, 24 * 60 + 90, { rowsAtEnd: 30 });
  const s3 = ended('c', 48 * 60, 48 * 60 + 30, { rowsAtEnd: 5 });
  const active = makeSession({ id: 'z', startedAt: iso(72 * 60) });
  const pauses = [
    makePause(10, 25, { sessionId: 'a' }),
    makePause(24 * 60 + 10, 24 * 60 + 15, { id: 'p2', sessionId: 'b' }),
    makePause(24 * 60 + 40, 24 * 60 + 50, { id: 'p3', sessionId: 'b' }),
  ];
  const reviews: Review[] = [{ sessionId: 'b', mood: 4, zones: ['neck'], createdAt: iso(0) }];

  it('CA6.1 : sessions terminées de la plus récente à la plus ancienne, cumul de tricot', () => {
    const j = journal([s1, active, s3, s2], pauses, reviews);
    expect(j.entries.map((e) => e.session.id)).toEqual(['c', 'b', 'a']);
    expect(j.totalKnitMs).toBe(45 * MIN + 75 * MIN + 30 * MIN);
  });

  it('chaque ligne porte ses temps, nombre de pauses, rangs faits et bilan', () => {
    const b = journal([s2], pauses, reviews).entries[0];
    expect(b).toMatchObject({
      times: { sessionMs: 90 * MIN, pauseMs: 15 * MIN, knitMs: 75 * MIN },
      pauseCount: 2,
      rowsDone: 20,
      review: reviews[0],
    });
  });

  it('rangs faits plancher à 0 ; absents si la session n’a pas de rowsAtEnd', () => {
    expect(journal([s3], [], []).entries[0]?.rowsDone).toBe(0);
    expect(journal([ended('d', 0, 10)], [], []).entries[0]?.rowsDone).toBeUndefined();
  });

  it('CA6.2 : une durée corrigée remplace le calcul dans la ligne et le cumul', () => {
    const fixed = { ...s1, manualKnitSeconds: 2 * 3600 };
    const j = journal([fixed, s3], pauses, []);
    expect(j.entries[1]?.times.knitMs).toBe(2 * HOUR);
    expect(j.totalKnitMs).toBe(2 * HOUR + 30 * MIN);
  });

  it('projet sans session → journal vide', () => {
    expect(journal([], [], [])).toEqual({ entries: [], totalKnitMs: 0 });
  });
});

describe('knitByDay (accueil, « 7 derniers jours »)', () => {
  const day = (n: number) => ({ start: at(n * 24 * 60), end: at((n + 1) * 24 * 60) });
  const days = [day(0), day(1), day(2)];

  it('chaque session compte au jour de son début, pauses déduites', () => {
    const a = ended('a', 0, 60);
    const b = ended('b', 120, 150);
    const c = ended('c', 24 * 60 + 10, 24 * 60 + 40);
    const pauses = [makePause(10, 25, { sessionId: 'a' })];
    expect(knitByDay([a, b, c], pauses, days, at(3 * 24 * 60))).toEqual([
      45 * MIN + 30 * MIN,
      30 * MIN,
      0,
    ]);
  });

  it('une session active compte jusqu’à maintenant', () => {
    const live = makeSession({ id: 'live', startedAt: iso(2 * 24 * 60 + 5) });
    expect(knitByDay([live], [], days, at(2 * 24 * 60 + 25))).toEqual([0, 0, 20 * MIN]);
  });

  it('durée corrigée prioritaire ; sessions hors fenêtre ignorées', () => {
    const fixed = ended('f', 30, 40, { manualKnitSeconds: 3600 });
    const before = ended('old', -24 * 60, -23 * 60);
    expect(knitByDay([fixed, before], [], days, at(3 * 24 * 60))).toEqual([HOUR, 0, 0]);
  });

  it('borne de jour : début pile à minuit → jour suivant', () => {
    const midnight = ended('m', 24 * 60, 24 * 60 + 15);
    expect(knitByDay([midnight], [], days, at(3 * 24 * 60))).toEqual([0, 15 * MIN, 0]);
  });
});
