import { expect, test } from './fixtures';
import { createProject, dbAll, dbCounts } from './helpers';

test('CA1.3 : aucun projet → état vide et bouton de création', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aucun projet pour l’instant' })).toBeVisible();
  await page.getByRole('link', { name: 'Créer mon premier projet' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nouveau projet' })).toBeVisible();
});

test('CA1.1 : nom obligatoire, projet créé « À faire », compteurs à 0, en tête de E1', async ({
  page,
}) => {
  await page.goto('/projects/new');
  const create = page.getByRole('button', { name: 'Créer le projet' });
  await expect(create).toBeDisabled();
  await page.getByLabel('Nom *').fill('   ');
  await expect(create).toBeDisabled();
  await page.getByLabel('Nom *').fill('Bonnet côtelé');
  await page.getByRole('button', { name: 'Tricot' }).click();
  await page.getByLabel('Laine, aiguilles, crochet').fill('mérinos, aig. 4 mm');
  await create.click();

  await expect(page.getByRole('heading', { level: 1, name: 'Bonnet côtelé' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Statut', exact: true })).toHaveValue('todo');
  await expect(page.getByText('Note : mérinos, aig. 4 mm')).toBeVisible();
  await expect(page.locator('output').first()).toHaveText('0');

  await page.getByRole('link', { name: 'Retour' }).click();
  const first = page.getByRole('listitem').first();
  await expect(first).toContainText('Bonnet côtelé');
  await expect(first).toContainText('À faire');
  await expect(first).toContainText('Rang 0 · aucune session');
});

test('CA1.2 : tri par dernière activité, filtre par statut', async ({ page }) => {
  await createProject(page, 'Alpha');
  await createProject(page, 'Bravo');
  await createProject(page, 'Charlie');
  await page.goto('/');
  await expect(page.getByRole('listitem')).toHaveText([/Charlie/, /Bravo/, /Alpha/]);

  await page.getByRole('link', { name: /Alpha/ }).click();
  await page.getByRole('combobox', { name: 'Statut', exact: true }).selectOption('active');
  await page.getByRole('link', { name: 'Retour' }).click();
  await expect(page.getByRole('listitem')).toHaveText([/Alpha/, /Charlie/, /Bravo/]);

  await page.getByRole('button', { name: 'En cours' }).click();
  await expect(page.getByRole('listitem')).toHaveText([/Alpha/]);
  await page.getByRole('button', { name: 'Terminé' }).click();
  await expect(page.getByText('Aucun projet avec ce statut.')).toBeVisible();
  await page.getByRole('button', { name: 'Tous' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(3);
});

test('CA1.4 : changement de statut enregistré sans bouton, conservé après rechargement', async ({
  page,
}) => {
  await createProject(page, 'Écharpe');
  await page.getByRole('combobox', { name: 'Statut', exact: true }).selectOption('paused');
  await expect
    .poll(async () => (await dbAll<{ status: string }>(page, 'projects'))[0]?.status)
    .toBe('paused');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Statut', exact: true })).toHaveValue('paused');
});

test('E2 : modification d’un projet', async ({ page }) => {
  const id = await createProject(page, 'Mitaines');
  await page.getByRole('link', { name: 'Modifier le projet' }).click();
  await page.getByLabel('Nom *').fill('Mitaines torsadées');
  await page.getByRole('button', { name: 'Crochet' }).click();
  await page.getByRole('combobox', { name: 'Statut' }).selectOption('done');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page).toHaveURL(new RegExp(`/projects/${id}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mitaines torsadées');
  await expect(page.getByText('Crochet')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Statut', exact: true })).toHaveValue('done');
});

test('CA1.5 : suppression confirmée → tout disparaît d’IndexedDB', async ({ page }) => {
  await createProject(page, 'À garder');
  const id = await createProject(page, 'À supprimer');
  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  await expect(page).toHaveURL(/\/session$/);
  await page.goto(`/projects/${id}`);
  await page.getByRole('link', { name: 'Modifier le projet' }).click();
  await page.getByRole('button', { name: 'Supprimer le projet' }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('1 session');
  await dialog.getByRole('button', { name: 'Annuler' }).click();
  expect((await dbCounts(page)).projects).toBe(2);

  await page.getByRole('button', { name: 'Supprimer le projet' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mes projets' })).toBeVisible();
  const counts = await dbCounts(page);
  expect(counts).toMatchObject({ projects: 1, sessions: 0, pauses: 0, reviews: 0 });
  const [kept] = await dbAll<{ name: string }>(page, 'projects');
  expect(kept?.name).toBe('À garder');
});

test('compteurs de la fiche, remise à zéro confirmée (CA4.3, CA4.4)', async ({ page }) => {
  await createProject(page, 'Plaid');
  const rows = page.getByRole('status').or(page.locator('output')).first();
  await page.getByRole('button', { name: '+1 rang' }).click();
  await page.getByRole('button', { name: '+1 rang' }).click();
  await page.getByRole('button', { name: '+1 maille' }).click();
  await expect(rows).toHaveText('2');
  await page.getByRole('button', { name: 'Ràz des rangs' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click();
  await expect(rows).toHaveText('2');
  await page.getByRole('button', { name: 'Ràz des rangs' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remettre à zéro' }).click();
  await expect(rows).toHaveText('0');
  await page.reload();
  await expect(page.locator('output').nth(1)).toHaveText('1');
});
