import { toggleZone, zonesToStore } from './review';

describe('sélection des zones du bilan (US5.1, CA5.3)', () => {
  it('rien de sélectionné au départ, puis une zone', () => {
    expect(toggleZone([], 'neck')).toEqual(['neck']);
  });

  it('ajoute et retire une zone', () => {
    expect(toggleZone(['neck'], 'back')).toEqual(['neck', 'back']);
    expect(toggleZone(['neck', 'back'], 'neck')).toEqual(['back']);
  });

  it('« Aucune » désélectionne les autres zones', () => {
    expect(toggleZone(['neck', 'back'], 'none')).toBe('none');
  });

  it('CA5.3 : « Aucune » puis « Cou » → « Aucune » se décoche', () => {
    expect(toggleZone('none', 'neck')).toEqual(['neck']);
  });

  it('« Aucune » cochée deux fois → plus rien', () => {
    expect(toggleZone('none', 'none')).toEqual([]);
  });

  it('stockage : « Aucune » et rien sont tous deux enregistrés en []', () => {
    expect(zonesToStore('none')).toEqual([]);
    expect(zonesToStore([])).toEqual([]);
    expect(zonesToStore(['eyes'])).toEqual(['eyes']);
  });
});
