import { resolveLocale } from './locale';

describe('resolveLocale (RG16, CA7.3)', () => {
  it.each([
    ['fr', 'fr'],
    ['fr-FR', 'fr'],
    ['fr-CA', 'fr'],
    ['FR-be', 'fr'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('%s → %s', (language, expected) => {
    expect(resolveLocale(language)).toBe(expected);
  });
});
