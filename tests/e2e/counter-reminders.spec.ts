import { expect, test } from './fixtures';
import { createProject } from './helpers';

test('rappel de rang : créé sur E3, affiché en session au rang prévu, marqué fait', async ({
  page,
}) => {
  await createProject(page, 'Pull');
  await expect(page.getByText('Aucun rappel.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un rappel' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ajouter un rappel' });
  await sheet.getByLabel('Au rang').fill('2');
  await sheet.getByLabel('Type').selectOption('cutYarn');
  await sheet.getByLabel('Précision (facultatif)').fill('couleur B');
  await sheet.getByRole('button', { name: 'Ajouter un rappel' }).click();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Couper la laine — couleur B' }),
  ).toContainText('Rang 2');

  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  const due = page.getByText('Rang 2 atteint Couper la laine — couleur B');
  await page.getByRole('button', { name: /Rang \d+ \+ 1/ }).click();
  await expect(page.getByTestId('row-count')).toHaveText('1');
  await expect(due).toBeHidden();
  await page.getByRole('button', { name: /Rang \d+ \+ 1/ }).click();
  await expect(due).toBeVisible();
  await page.getByRole('button', { name: 'Fait' }).click();
  await expect(due).toBeHidden();
});
