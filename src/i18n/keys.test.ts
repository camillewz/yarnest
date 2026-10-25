import en from './locales/en.json';
import fr from './locales/fr.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('clés i18n (CA7.4)', () => {
  it('fr.json et en.json ont exactement les mêmes clés', () => {
    expect(keys(fr).sort()).toEqual(keys(en).sort());
  });
});
