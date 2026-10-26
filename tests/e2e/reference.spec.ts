import { expect, test } from './fixtures';
import { MIN, T0, dbAll, fixedClock, launchPause, startSession } from './helpers';

// Scénario de référence (docs/SPEC.md, section 10), à garder vert en permanence.
test('créer, démarrer, compter, pause, recharger, reprendre, terminer, bilan, journal', async ({
  page,
}) => {
  const clock = await fixedClock(page, T0);
  await startSession(page, 'Bonnet côtelé');
  await clock.advance(10 * MIN);

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /Rang \d+ \+ 1/ }).click();
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '+1 maille' }).click();
  await expect(page.getByTestId('row-count')).toHaveText('3');
  await expect(page.getByRole('main').locator('output')).toHaveText('5');

  await launchPause(page, 5);
  await page.reload();
  await clock.advance(8 * MIN);
  await expect(page.getByText('(terminée il y a 3 min)')).toBeVisible();
  await page.getByRole('button', { name: 'Reprendre' }).click();
  await expect(page.getByTestId('knit-time')).toHaveText('10:00');
  await expect(page.getByTestId('pause-time')).toHaveText('08:00');

  await clock.advance(12 * MIN);
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByText('Tricot 22 min · Pause 8 min (1)')).toBeVisible();
  await expect(page.getByText('Session 30 min · +3 rangs')).toBeVisible();
  await page.getByRole('radio', { name: '4 sur 5' }).click();
  await page.getByRole('button', { name: 'Poignets' }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonnet côtelé');
  await expect(page.getByTestId('journal-total')).toHaveText('22 min de tricot');
  const entry = page.getByRole('list').last().getByRole('listitem').first();
  await expect(entry).toContainText('22 min tricot · 8 min pause');
  await expect(entry).toContainText('+3 rangs');
  await expect(entry).toContainText('Poignets');
  await expect(entry.getByRole('img', { name: 'Ressenti 4 sur 5' })).toBeVisible();
  const [project] = await dbAll<{ rowCount: number; stitchCount: number }>(page, 'projects');
  expect(project).toMatchObject({ rowCount: 3, stitchCount: 5 });
});
