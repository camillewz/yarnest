import { expect, test } from '@playwright/test';
import { MIN, T0, fixedClock, launchPause, startSession } from './helpers';

let clock: Awaited<ReturnType<typeof fixedClock>>;
test.beforeEach(async ({ page }) => {
  clock = await fixedClock(page, T0);
});

const r1 = (page: import('@playwright/test').Page) =>
  page.getByText('30 min de tricot. Une pause ?');

test('CA3.5 : R1 à 30 min de tricot, une seule fois, même après rechargement', async ({ page }) => {
  await startSession(page);
  await clock.advance(29 * MIN);
  await page.waitForTimeout(1200);
  await expect(r1(page)).toBeHidden();
  await clock.advance(1 * MIN);
  await expect(r1(page)).toBeVisible();
  await page.reload();
  await clock.advance(1 * MIN);
  await page.waitForTimeout(1200);
  await expect(r1(page)).toBeHidden();
});

test('R1 disparaît seul après 10 s ; « Oui » ouvre la feuille de pause', async ({ page }) => {
  await startSession(page);
  await clock.advance(30 * MIN);
  await expect(r1(page)).toBeVisible();
  await page.getByRole('button', { name: 'Oui' }).click();
  await expect(page.getByRole('dialog', { name: 'Durée de la pause' })).toBeVisible();
});

test('CA3.6 : retour après 1 h 10 de tricot → seul R2', async ({ page }) => {
  await startSession(page);
  await page.goto('/');
  await clock.advance(70 * MIN);
  await page.getByRole('link', { name: 'Reprendre' }).click();
  await expect(page.getByRole('dialog', { name: '1 h sans pause' })).toBeVisible();
  await expect(r1(page)).toBeHidden();
  await page.getByRole('button', { name: 'Plus tard' }).click();
  await expect(page.getByRole('dialog', { name: '1 h sans pause' })).toBeHidden();
});

test('CA3.7 : R3 → « Continuer » : un R3 toutes les 30 min', async ({ page }) => {
  await startSession(page);
  await clock.advance(120 * MIN);
  const r3 = page.getByRole('dialog', { name: '2 h sans pause' });
  await expect(r3).toBeVisible();
  await page.getByRole('button', { name: 'Continuer de me le rappeler' }).click();
  await expect(r3).toBeHidden();
  await clock.advance(29 * MIN);
  await page.waitForTimeout(1200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await clock.advance(1 * MIN);
  await expect(page.getByRole('dialog', { name: '2 h 30 sans pause' })).toBeVisible();
});

test('CA3.7 : R3 → « Ne plus » : aucun rappel jusqu’à la fin, même après une pause', async ({
  page,
}) => {
  await startSession(page);
  await clock.advance(120 * MIN);
  await page.getByRole('button', { name: 'Ne plus me le rappeler' }).click();
  await clock.advance(60 * MIN);
  await launchPause(page);
  await page.getByRole('button', { name: 'Arrêter la pause' }).click();
  await clock.advance(180 * MIN);
  await page.waitForTimeout(1200);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Une pause ?' })).toHaveCount(0);
});

test('une pause remet les paliers à zéro (RG08)', async ({ page }) => {
  await startSession(page);
  await clock.advance(30 * MIN);
  await expect(r1(page)).toBeVisible();
  await launchPause(page);
  await clock.advance(5 * MIN);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await clock.advance(30 * MIN);
  await expect(r1(page)).toBeVisible();
});
