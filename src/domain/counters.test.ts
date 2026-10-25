import {
  decrementRow,
  decrementStitch,
  incrementRow,
  incrementStitch,
  resetRows,
  resetStitches,
  rowsDone,
} from './counters';

describe('compteurs (RG11)', () => {
  it('CA4.1 : rang 34, mailles 12 → +1 rang : rang 35, mailles 0', () => {
    expect(incrementRow({ rowCount: 34, stitchCount: 12 })).toEqual({
      rowCount: 35,
      stitchCount: 0,
    });
  });

  it('−1 rang ne restaure pas les mailles', () => {
    expect(decrementRow({ rowCount: 35, stitchCount: 0 })).toEqual({
      rowCount: 34,
      stitchCount: 0,
    });
    expect(decrementRow({ rowCount: 35, stitchCount: 7 })).toEqual({
      rowCount: 34,
      stitchCount: 7,
    });
  });

  it('CA4.2 : rang 0 → −1 sans effet', () => {
    expect(decrementRow({ rowCount: 0, stitchCount: 3 })).toEqual({
      rowCount: 0,
      stitchCount: 3,
    });
  });

  it('mailles : +1 et −1, plancher à 0, rang inchangé', () => {
    expect(incrementStitch({ rowCount: 4, stitchCount: 12 })).toEqual({
      rowCount: 4,
      stitchCount: 13,
    });
    expect(decrementStitch({ rowCount: 4, stitchCount: 1 })).toEqual({
      rowCount: 4,
      stitchCount: 0,
    });
    expect(decrementStitch({ rowCount: 4, stitchCount: 0 })).toEqual({
      rowCount: 4,
      stitchCount: 0,
    });
  });

  it('remise à zéro de chaque compteur, indépendamment', () => {
    expect(resetRows({ rowCount: 34, stitchCount: 12 })).toEqual({ rowCount: 0, stitchCount: 12 });
    expect(resetStitches({ rowCount: 34, stitchCount: 12 })).toEqual({
      rowCount: 34,
      stitchCount: 0,
    });
  });

  it('CA4.5 : 20 incréments successifs → rang + 20 exactement', () => {
    let counters = { rowCount: 34, stitchCount: 5 };
    for (let i = 0; i < 20; i++) counters = incrementRow(counters);
    expect(counters).toEqual({ rowCount: 54, stitchCount: 0 });
  });

  it('ne modifie pas l’objet reçu', () => {
    const counters = Object.freeze({ rowCount: 1, stitchCount: 1 });
    expect(() => incrementRow(counters)).not.toThrow();
    expect(counters).toEqual({ rowCount: 1, stitchCount: 1 });
  });
});

describe('rangs faits pendant une session (RG12)', () => {
  it.each([
    [22, 34, 12],
    [34, 34, 0],
    [34, 10, 0],
  ])('début %i, fin %i → %i', (start, end, expected) => {
    expect(rowsDone(start, end)).toBe(expected);
  });
});
