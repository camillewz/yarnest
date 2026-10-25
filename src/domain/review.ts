import type { BodyZone } from './types';

/** Sélection en cours dans le bilan : des zones, ou « Aucune ». */
export type ZoneSelection = BodyZone[] | 'none';

export const BODY_ZONES: readonly BodyZone[] = [
  'neck',
  'back',
  'shoulders',
  'elbows',
  'wrists',
  'hands',
  'eyes',
];

/** US5.1 : « Aucune » désélectionne les autres zones et inversement. */
export function toggleZone(selection: ZoneSelection, zone: BodyZone | 'none'): ZoneSelection {
  if (zone === 'none') return selection === 'none' ? [] : 'none';
  const zones = selection === 'none' ? [] : selection;
  return zones.includes(zone) ? zones.filter((z) => z !== zone) : [...zones, zone];
}

/** `zones: []` en base vaut « Aucune » comme « rien coché » (section 4). */
export const zonesToStore = (selection: ZoneSelection): BodyZone[] =>
  selection === 'none' ? [] : selection;
