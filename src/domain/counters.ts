import type { Project } from './types';

export type Counters = Pick<Project, 'rowCount' | 'stitchCount'>;

// RG11 : +1 rang remet les mailles à 0 ; −1 ne descend jamais sous 0 et ne restaure pas les mailles.
export const incrementRow = (c: Counters): Counters => ({
  rowCount: c.rowCount + 1,
  stitchCount: 0,
});

export const decrementRow = (c: Counters): Counters => ({
  rowCount: Math.max(0, c.rowCount - 1),
  stitchCount: c.stitchCount,
});

export const incrementStitch = (c: Counters): Counters => ({
  rowCount: c.rowCount,
  stitchCount: c.stitchCount + 1,
});

export const decrementStitch = (c: Counters): Counters => ({
  rowCount: c.rowCount,
  stitchCount: Math.max(0, c.stitchCount - 1),
});

// La confirmation de remise à zéro relève de l'interface.
export const resetRows = (c: Counters): Counters => ({ rowCount: 0, stitchCount: c.stitchCount });

export const resetStitches = (c: Counters): Counters => ({ rowCount: c.rowCount, stitchCount: 0 });

/** RG12 : rangs faits pendant une session, plancher à 0. */
export const rowsDone = (rowsAtStart: number, rowCountAtEnd: number): number =>
  Math.max(0, rowCountAtEnd - rowsAtStart);
