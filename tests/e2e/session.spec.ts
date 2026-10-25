import { expect, test } from '@playwright/test';
import {
  MIN,
  fixedClock,
  T0,
  dbAll,
  knit,
  launchPause,
  pauseTime,
  rowCount,
  sessionTime,
  startSession,
} from './helpers';

// Heure figée à T0 : seul clock.advance fait avancer le temps, sans dérive entre deux étapes.
let clock: Awaited<ReturnType<typeof fixedClock>>;
test.beforeEach(async ({ page }) => {
  clock = await fixedClock(page, T0);
});

test('CA2.1 : démarrer crée la session et passe le projet « En cours »', async ({ page }) => {
  const id = await startSession(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonnet côtelé');
  const [session] = await dbAll<{ startedAt: string; rowsAtStart: number }>(page, 'sessions');
  expect(session).toMatchObject({ startedAt: T0.toISOString(), rowsAtStart: 0 });
  await page.goto(`/projects/${id}`);
  await expect(page.getByLabel('Statut')).toHaveValue('active');
  await expect(page.getByRole('button', { name: 'Reprendre la session' })).toBeVisible();
});

test('CA2.2 : une session active sur A bloque B tant que A n’est pas terminée', async ({
  page,
}) => {
  await startSession(page, 'A');
  await page.goto('/projects/new');
  await page.getByLabel('Nom *').fill('B');
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Terminer la session sur A ?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  expect((await dbAll(page, 'sessions')).length).toBe(1);

  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  await page.getByRole('button', { name: 'Terminer et démarrer' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('B');
  const sessions = await dbAll<{ endedAt?: string }>(page, 'sessions');
  expect(sessions.filter((s) => !s.endedAt)).toHaveLength(1);
});

test('CA2.3 et CA3.2 : 10 min dont 3 de pause → 07:00, 03:00, 10:00 ; tricot figé en pause', async ({
  page,
}) => {
  await startSession(page);
  await clock.advance(7 * MIN);
  await expect(knit(page)).toHaveText('07:00');
  await launchPause(page);
  await clock.advance(3 * MIN);
  await expect(page.getByRole('timer')).toHaveText('02:00');
  await expect(page.getByText('Tricot figé à 07:00')).toBeVisible();
  await page.getByRole('button', { name: 'Arrêter la pause' }).click();
  await expect(knit(page)).toHaveText('07:00');
  await expect(pauseTime(page)).toHaveText('03:00');
  await expect(sessionTime(page)).toHaveText('10:00');
});

test('CA2.4 : rechargement 60 min plus tard → temps exacts, rang identique', async ({ page }) => {
  await startSession(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Ajouter un rang/ }).click();
  await expect(rowCount(page)).toHaveText('3');
  await clock.advance(60 * MIN);
  await page.reload();
  await expect(knit(page)).toHaveText('1:00:00');
  await expect(sessionTime(page)).toHaveText('1:00:00');
  await expect(rowCount(page)).toHaveText('3');
});

test('CA2.5 : pause en cours au rechargement → E5 avec le temps restant exact', async ({
  page,
}) => {
  await startSession(page);
  await clock.advance(10 * MIN);
  await launchPause(page, 10);
  await clock.advance(4 * MIN);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('06:00');
});

test('CA2.7 : navigateur sans Wake Lock → aucune erreur, session utilisable', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.addInitScript(() => {
    delete (Navigator.prototype as unknown as Record<string, unknown>).wakeLock;
  });
  await startSession(page);
  await page.getByRole('button', { name: /Ajouter un rang/ }).click();
  await expect(rowCount(page)).toHaveText('1');
  expect(errors).toEqual([]);
});

test('CA3.1 : 5 min par défaut, bornes 5 et 60 par paliers de 5', async ({ page }) => {
  await startSession(page);
  await page.getByRole('button', { name: 'Faire une pause' }).click();
  const value = page.getByRole('dialog').locator('output');
  await expect(value).toHaveText('5 min');
  await expect(page.getByRole('button', { name: '5 minutes de moins' })).toBeDisabled();
  for (let i = 0; i < 11; i++)
    await page.getByRole('button', { name: '5 minutes de plus' }).click();
  await expect(value).toHaveText('60 min');
  await expect(page.getByRole('button', { name: '5 minutes de plus' })).toBeDisabled();
  await page.getByRole('button', { name: '5 minutes de moins' }).click();
  await expect(value).toHaveText('55 min');
});

test('CA3.3 : fin du compte à rebours au premier plan → vibration, message, « Reprendre »', async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { vibrations: unknown[] }).vibrations = [];
    navigator.vibrate = (p) => {
      (window as unknown as { vibrations: unknown[] }).vibrations.push(p);
      return true;
    };
  });
  await startSession(page);
  await launchPause(page);
  await clock.advance(5 * MIN);
  await expect(page.getByRole('alert')).toHaveText('Pause terminée');
  expect(
    await page.evaluate(() => (window as unknown as { vibrations: unknown[] }).vibrations),
  ).toContainEqual([200, 100, 200]);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeHidden();
});

test('CA3.4 : pause de 5 min, retour après 8 min → terminée il y a 3 min, 8 min de pause', async ({
  page,
}) => {
  await startSession(page);
  await launchPause(page);
  await clock.advance(8 * MIN);
  await page.reload();
  await expect(page.getByText('(terminée il y a 3 min)')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await expect(pauseTime(page)).toHaveText('08:00');
  await expect(knit(page)).toHaveText('00:00');
});

test('CA4.1 et CA4.5 : +1 rang remet les mailles à 0 ; 20 taps rapides → +20', async ({ page }) => {
  await startSession(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Ajouter une maille' }).click();
  await expect(page.getByRole('main').locator('output')).toHaveText('4');
  const zone = page.getByRole('button', { name: /Ajouter un rang/ });
  for (let i = 0; i < 20; i++) await zone.click({ delay: 0, noWaitAfter: true });
  await expect(rowCount(page)).toHaveText('20');
  await expect(page.getByRole('main').locator('output')).toHaveText('0');
  await page.getByRole('button', { name: 'Retirer un rang' }).click();
  await expect(rowCount(page)).toHaveText('19');
});

test('E4 : la zone +1 rang occupe au moins un tiers de la hauteur', async ({ page }) => {
  await startSession(page);
  const box = await page.getByRole('button', { name: /Ajouter un rang/ }).boundingBox();
  const height = page.viewportSize()!.height;
  expect(box!.height).toBeGreaterThanOrEqual(height / 3 - 1);
});

test('CA4.4 : compteurs modifiés hors session repris à la session suivante', async ({ page }) => {
  const { createProject } = await import('./helpers');
  await createProject(page, 'Plaid');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Ajouter un rang' }).click();
  await expect(page.locator('output').first()).toHaveText('5');
  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  await expect(rowCount(page)).toHaveText('5');
  const [session] = await dbAll<{ rowsAtStart: number }>(page, 'sessions');
  expect(session?.rowsAtStart).toBe(5);
});
