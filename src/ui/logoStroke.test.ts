import { LETTER_STEM, logoStroke } from './logoStroke';

describe('logoStroke', () => {
  it('égale le fût des lettres « arnest » en petit (≤ 24 px)', () => {
    expect(logoStroke(20).stem).toBeCloseTo(LETTER_STEM);
    expect(logoStroke(24).stem).toBeCloseTo(LETTER_STEM);
  });

  it('rejoint la maquette en grand (≥ 96 px) : fût × 1,1 ≈ 9,9', () => {
    expect(logoStroke(96).stem).toBeCloseTo(9.86, 1);
    expect(logoStroke(400).stem).toBeCloseTo(9.86, 1);
  });

  it('s’épaissit continûment entre les deux, en unités comme en pixels', () => {
    const sizes = [24, 40, 60, 80, 96];
    const units = sizes.map((h) => logoStroke(h).stem);
    const px = sizes.map((h, i) => (units[i]! * h) / 108);
    units.slice(1).forEach((u, i) => expect(u).toBeGreaterThan(units[i]!));
    px.slice(1).forEach((p, i) => expect(p).toBeGreaterThan(px[i]!));
  });

  it('feuilles un peu plus fines que la tige, comme sur la maquette (9,1 / 9,9)', () => {
    const { stem, leaf } = logoStroke(96);
    expect(leaf / stem).toBeCloseTo(0.92, 2);
  });

  it('hauteur inconnue (avant mesure) : valeur des petites tailles', () => {
    expect(logoStroke(0).stem).toBeCloseTo(LETTER_STEM);
  });
});
