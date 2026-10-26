import { expect, test } from './fixtures';

const routes = [
  ['/', 'Mes projets', 'My projects'],
  ['/projects/new', 'Nouveau projet', 'New project'],
  ['/projects/abc', 'Fiche projet', 'Project'],
  ['/projects/abc/edit', 'Modifier le projet', 'Edit project'],
  ['/sessions/abc/review', 'Bilan de session', 'Session review'],
  ['/settings', 'Réglages', 'Settings'],
  ['/journal', 'Journal', 'Log'],
] as const;

const locales = [
  { locale: 'fr-FR', lang: 'fr', column: 1 },
  { locale: 'en-US', lang: 'en', column: 2 },
] as const;

for (const { locale, lang, column } of locales) {
  test.describe(`langue navigateur ${locale}`, () => {
    test.use({ locale });

    for (const route of routes) {
      const [path] = route;
      test(`${path} affiche son titre`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(route[column]);
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        // Aucun défilement horizontal (section 8).
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(overflow).toBe(false);
      });
    }
  });
}
