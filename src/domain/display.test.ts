import { YARN_SWATCH_COUNT, greetingPeriod, yarnSwatch } from './display';

describe('greetingPeriod (accueil)', () => {
  it.each([
    [5, 'morning'],
    [11, 'morning'],
    [12, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [23, 'evening'],
    [0, 'evening'],
    [4, 'evening'],
  ] as const)('%i h → %s', (hour, period) => {
    expect(greetingPeriod(hour)).toBe(period);
  });
});

describe('yarnSwatch (couleur de laine dérivée du projet)', () => {
  it('stable pour un même identifiant', () => {
    const id = '6f1c2a4e-0b7d-4c1e-9a55-3c2d1e0f9b8a';
    expect(yarnSwatch(id)).toBe(yarnSwatch(id));
  });

  it('toujours un index de la palette', () => {
    for (let i = 0; i < 200; i++) {
      const index = yarnSwatch(`projet-${i}`);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(YARN_SWATCH_COUNT);
    }
  });

  it('répartit les projets sur toute la palette', () => {
    const used = new Set(Array.from({ length: 50 }, (_, i) => yarnSwatch(crypto.randomUUID() + i)));
    expect(used.size).toBe(YARN_SWATCH_COUNT);
  });
});
