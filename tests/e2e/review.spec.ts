import { expect, test, type Page } from '@playwright/test';
import { HOUR_MS, MIN, T0, dbAll, fixedClock, launchPause, startSession } from './helpers';

let clock: Awaited<ReturnType<typeof fixedClock>>;
test.beforeEach(async ({ page }) => {
  clock = await fixedClock(page, T0);
});

async function finish(page: Page) {
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/\/sessions\/.+\/review$/);
}

const addRows = async (page: Page, n: number) => {
  for (let i = 0; i < n; i++) await page.getByRole('button', { name: /Ajouter un rang/ }).click();
};

test('CA5.1 et CA2.8 : bilan affiché, « Passer » → session au journal sans bilan', async ({
  page,
}) => {
  await startSession(page);
  await addRows(page, 12);
  await clock.advance(40 * MIN);
  await launchPause(page);
  await clock.advance(10 * MIN);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await launchPause(page);
  await clock.advance(5 * MIN);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await clock.advance(40 * MIN);
  await finish(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Session terminée · Bonnet côtelé',
  );
  await expect(page.getByText('Tricot 1 h 20 · Pause 15 min (2)')).toBeVisible();
  await expect(page.getByText('Session 1 h 35 · +12 rangs')).toBeVisible();

  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonnet côtelé');
  await expect(page.getByTestId('journal-total')).toHaveText('1 h 20 de tricot');
  await expect(page.getByRole('listitem').filter({ hasText: '1 h 20 tricot' })).toContainText(
    '+12 rangs',
  );
  expect(await dbAll(page, 'reviews')).toEqual([]);
});

test('CA5.2 : ressenti 4 + « Enregistrer » → bilan en 2 taps, zones vides', async ({ page }) => {
  await startSession(page);
  await clock.advance(20 * MIN);
  await finish(page);
  await page.getByRole('radio', { name: '4 sur 5' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonnet côtelé');
  const [review] = await dbAll<{ mood: number; zones: string[] }>(page, 'reviews');
  expect(review).toMatchObject({ mood: 4, zones: [] });
  await expect(page.getByRole('img', { name: 'Ressenti 4 sur 5' })).toBeVisible();
});

test('CA5.3 : « Aucune » puis « Cou » → « Aucune » se décoche', async ({ page }) => {
  await startSession(page);
  await finish(page);
  const none = page.getByRole('button', { name: 'Aucune' });
  const neck = page.getByRole('button', { name: 'Cou', exact: true });
  await none.click();
  await expect(none).toHaveAttribute('aria-pressed', 'true');
  await neck.click();
  await expect(none).toHaveAttribute('aria-pressed', 'false');
  await expect(neck).toHaveAttribute('aria-pressed', 'true');
  await none.click();
  await expect(neck).toHaveAttribute('aria-pressed', 'false');
});

test('CA2.6 : dernière action à T, ouverture à T + 12 h 01 → clôture auto, carte de bilan', async ({
  page,
}) => {
  await startSession(page);
  await clock.advance(30 * MIN);
  await page.getByRole('button', { name: /Ajouter un rang/ }).click();
  await expect(page.getByTestId('row-count')).toHaveText('1');
  const lastAction = T0.getTime() + 30 * MIN;
  await clock.advance(12 * HOUR_MS + MIN);
  await page.goto('/');
  const card = page.getByRole('link', { name: /Faire le bilan de ta session/ });
  await expect(card).toBeVisible();
  const [session] = await dbAll<{ endedAt: string; endReason: string }>(page, 'sessions');
  expect(session).toMatchObject({
    endedAt: new Date(lastAction).toISOString(),
    endReason: 'auto12h',
  });
  await card.click();
  await expect(
    page.getByText('Session fermée automatiquement après 12 h sans activité.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.goto('/');
  await expect(card).toBeHidden();
});

async function sessionOf(page: Page, minutes: number) {
  await page.getByRole('button', { name: /Démarrer une session|Reprendre la session/ }).click();
  await clock.advance(minutes * MIN);
  await finish(page);
  await page.getByRole('button', { name: 'Passer' }).click();
  await clock.advance(24 * HOUR_MS);
}

test('CA6.1 à CA6.3 : journal trié, correction et suppression', async ({ page }) => {
  await startSession(page, 'Plaid');
  await clock.advance(30 * MIN);
  await finish(page);
  await page.getByRole('button', { name: 'Passer' }).click();
  await clock.advance(24 * HOUR_MS);
  await sessionOf(page, 45);
  await sessionOf(page, 60);

  const entries = page.getByRole('list').last().getByRole('listitem');
  await expect(entries).toHaveText([/1 h 00 tricot/, /45 min tricot/, /30 min tricot/]);
  await expect(page.getByTestId('journal-total')).toHaveText('2 h 15 de tricot');

  await entries.nth(1).getByRole('button').click();
  await page.getByLabel('Heures').fill('1');
  await page.getByLabel('Minutes').fill('5');
  await page.getByRole('button', { name: 'Enregistrer la durée' }).click();
  await expect(entries.nth(1)).toContainText('1 h 05 tricot (corrigé)');
  await expect(page.getByTestId('journal-total')).toHaveText('2 h 35 de tricot');

  await entries.nth(0).getByRole('button').click();
  await page.getByRole('button', { name: 'Supprimer la session' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(entries).toHaveCount(2);
  await expect(page.getByTestId('journal-total')).toHaveText('1 h 35 de tricot');
  expect(await dbAll(page, 'sessions')).toHaveLength(2);
});
