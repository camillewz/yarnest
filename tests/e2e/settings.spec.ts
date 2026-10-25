import { test as base } from '@playwright/test';
import { expect, test } from './fixtures';
import { MIN, T0, createProject, dbAll, dbCounts, fixedClock, startSession } from './helpers';

test('CA3.8 : rappels désactivés dans E7 → aucun rappel, quelle que soit la durée', async ({
  page,
}) => {
  const clock = await fixedClock(page, T0);
  await page.goto('/settings');
  const toggle = page.getByRole('switch', { name: 'Rappels de pause' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await startSession(page);
  await clock.advance(30 * MIN);
  await page.waitForTimeout(1200);
  await clock.advance(200 * MIN);
  await page.waitForTimeout(1200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Une pause ?')).toHaveCount(0);
});

test('E7 : durée de pause par défaut reprise dans la feuille de pause', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: '5 minutes de plus' }).click();
  await page.getByRole('button', { name: '5 minutes de plus' }).click();
  await expect(page.locator('output')).toHaveText('15 min');
  await startSession(page);
  await page.getByRole('button', { name: 'Faire une pause' }).click();
  await expect(page.getByRole('dialog').locator('output')).toHaveText('15 min');
});

test('E7 : changement de langue appliqué et conservé', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('combobox', { name: 'Langue' }).selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect
    .poll(
      async () =>
        (await dbAll<{ key: string; value: string }>(page, 'settings')).find(
          (s) => s.key === 'locale',
        )?.value,
    )
    .toBe('en');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My projects');
});

test('export puis import : les données reviennent à l’identique', async ({ page }) => {
  await createProject(page, 'Bonnet');
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click();
  const file = await (await download).path();

  await page.goto('/');
  await createProject(page, 'Projet en trop');
  await page.goto('/settings');
  await page.getByLabel('Importer une sauvegarde').setInputFiles(file);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remplacer' }).click();
  await expect(page.getByText('Sauvegarde importée.')).toBeVisible();
  const projects = await dbAll<{ name: string }>(page, 'projects');
  expect(projects.map((p) => p.name)).toEqual(['Bonnet']);
});

test('import d’un fichier invalide → message, aucune donnée touchée', async ({ page }) => {
  await createProject(page, 'Bonnet');
  await page.goto('/settings');
  await page.getByLabel('Importer une sauvegarde').setInputFiles({
    name: 'autre.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"foo":1}'),
  });
  await expect(page.getByText('Ce fichier n’est pas une sauvegarde Yarnest valide.')).toBeVisible();
  expect((await dbCounts(page)).projects).toBe(1);
});

test('CA7.1 : onglet fermé juste après un tap → le tap est conservé', async ({ page, context }) => {
  await startSession(page);
  await page.getByRole('button', { name: /Rang \d+ \+ 1/ }).click();
  // L'affichage ne change qu'une fois la transaction écrite (section 8, Fiabilité) :
  // dès que le rang s'affiche, une fermeture forcée ne peut plus le perdre.
  await expect(page.getByTestId('row-count')).toHaveText('1');
  await page.close({ runBeforeUnload: false });
  const next = await context.newPage();
  await next.goto('/session');
  await expect(next.getByTestId('row-count')).toHaveText('1');
});

base.describe('premier lancement', () => {
  base(
    'CA7.2 : persist() demandé au premier lancement, résultat visible dans E7',
    async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as { persistCalls: number };
        w.persistCalls = 0;
        Object.defineProperty(navigator, 'storage', {
          value: {
            ...navigator.storage,
            persist: async () => (w.persistCalls++, true),
            persisted: async () => true,
          },
        });
      });
      await page.goto('/');
      await expect
        .poll(() =>
          page.evaluate(() => (window as unknown as { persistCalls: number }).persistCalls),
        )
        .toBe(1);
      await page.getByRole('button', { name: 'Passer' }).click();
      await page.goto('/settings');
      await expect(page.getByText('Stockage protégé : oui')).toBeVisible();
    },
  );

  base('onboarding : 3 écrans puis E1, jamais réaffiché', async ({ page }) => {
    await page.goto('/');
    const dialog = page.getByRole('dialog', { name: 'Bienvenue' });
    await expect(dialog.getByRole('heading')).toHaveText('Ton carnet de tricot');
    await dialog.getByRole('button', { name: 'Suivant' }).click();
    await expect(dialog.getByRole('heading')).toHaveText('Des pauses au bon moment');
    await dialog.getByRole('button', { name: 'Suivant' }).click();
    await expect(dialog.getByRole('heading')).toHaveText('Rien ne se perd');
    await dialog.getByRole('button', { name: 'C’est parti' }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Mes projets' })).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  for (const [locale, title] of [
    ['en-US', 'Your knitting notebook'],
    ['fr-CA', 'Ton carnet de tricot'],
    ['de-DE', 'Your knitting notebook'],
  ] as const) {
    base.describe(`CA7.3 : navigateur en ${locale}`, () => {
      base.use({ locale });
      base(
        `interface ${title.startsWith('Ton') ? 'en français' : 'en anglais'}`,
        async ({ page }) => {
          await page.goto('/');
          await expect(page.getByRole('dialog').getByRole('heading')).toHaveText(title);
        },
      );
    });
  }
});
