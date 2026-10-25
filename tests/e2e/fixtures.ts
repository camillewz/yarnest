import { test as base, expect } from '@playwright/test';

/** Chaque scénario part d'une app déjà prise en main : l'onboarding est passé une fois. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    await page
      .getByRole('dialog', { name: /Bienvenue|Welcome/ })
      .getByRole('button', { name: /Passer|Skip/ })
      .click();
    await expect(page.getByRole('dialog', { name: /Bienvenue|Welcome/ })).toBeHidden();
    await use(page);
  },
});

export { expect };
