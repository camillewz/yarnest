import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';
import { expect, test } from './fixtures';
import {
  MIN,
  T0,
  createProject,
  fixedClock,
  launchPause,
  projectItems,
  startSession,
} from './helpers';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

test('E1 vide, E1 avec projets, E2, E3, E7', async ({ page }) => {
  await expectNoViolations(page);
  const id = await createProject(page, 'Bonnet côtelé');
  await expectNoViolations(page);
  await page.goto('/');
  await expect(projectItems(page)).toHaveCount(1);
  await expectNoViolations(page);
  await page.goto(`/projects/${id}/edit`);
  await expectNoViolations(page);
  await page.goto('/projects/new');
  await expectNoViolations(page);
  await page.goto('/settings');
  await expectNoViolations(page);
});

test('E4, feuille de pause, E5, fin de pause, E6, journal', async ({ page }) => {
  const clock = await fixedClock(page, T0);
  await startSession(page);
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Lancer' }).click();
  await expectNoViolations(page);
  await clock.advance(6 * MIN);
  await expect(page.getByRole('alert')).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expectNoViolations(page);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/review$/);
  await expectNoViolations(page);
  await page.getByRole('radio', { name: '4 sur 5' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('list').last().getByRole('button').first().click();
  await expectNoViolations(page);
});

test('rappels R1, R2, R3', async ({ page }) => {
  const clock = await fixedClock(page, T0);
  await startSession(page);
  await clock.advance(30 * MIN);
  await expect(page.getByText('Une pause ?')).toBeVisible();
  await expectNoViolations(page);
  await clock.advance(30 * MIN);
  await expect(page.getByRole('dialog', { name: '1 h sans pause' })).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Plus tard' }).click();
  await clock.advance(60 * MIN);
  await expect(page.getByRole('dialog', { name: '2 h sans pause' })).toBeVisible();
  await expectNoViolations(page);
});

test('dialogue de confirmation et rappel de pause en cours', async ({ page }) => {
  await startSession(page);
  await launchPause(page);
  await expectNoViolations(page);
});

base('onboarding', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Bienvenue' })).toBeVisible();
  await expectNoViolations(page);
});
