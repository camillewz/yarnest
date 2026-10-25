import { expect, test } from './fixtures';
import { createProject } from './helpers';

test('hors ligne après la première visite : l’app et les données restent disponibles', async ({
  page,
  context,
}) => {
  const id = await createProject(page, 'Bonnet');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto(`/projects/${id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bonnet');
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Réglages');
  await context.setOffline(false);
});
