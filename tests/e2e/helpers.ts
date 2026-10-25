import { expect, type Page } from '@playwright/test';

export async function createProject(page: Page, name: string) {
  await page.goto('/projects/new');
  await page.getByLabel('Nom *').fill(name);
  await page.getByRole('button', { name: 'Créer le projet' }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  return page.url().split('/').pop()!;
}

/** Nombre d'enregistrements par table IndexedDB, lu directement dans le navigateur. */
export async function dbCounts(page: Page): Promise<Record<string, number>> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('yarnest');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const names = Array.from(db.objectStoreNames);
          const tx = db.transaction(names, 'readonly');
          const counts: Record<string, number> = {};
          for (const name of names) {
            const r = tx.objectStore(name).count();
            r.onsuccess = () => (counts[name] = r.result);
          }
          tx.oncomplete = () => {
            db.close();
            resolve(counts);
          };
        };
      }),
  );
}

/** Lit tous les enregistrements d'une table IndexedDB. */
export async function dbAll<T = Record<string, unknown>>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    (storeName) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('yarnest');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const r = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
          r.onsuccess = () => {
            db.close();
            resolve(r.result as T[]);
          };
        };
      }),
    store,
  );
}

export const T0 = new Date('2026-10-25T10:00:00Z');
export const MIN = 60_000;

/** Crée un projet et démarre une session dessus. */
export async function startSession(page: Page, name = 'Bonnet côtelé') {
  const id = await createProject(page, name);
  await page.getByRole('button', { name: 'Démarrer une session' }).click();
  await expect(page).toHaveURL(/\/session$/);
  return id;
}

export const knit = (page: Page) => page.getByTestId('knit-time');
export const pauseTime = (page: Page) => page.getByTestId('pause-time');
export const sessionTime = (page: Page) => page.getByTestId('session-time');
export const rowCount = (page: Page) => page.getByTestId('row-count');

export async function launchPause(page: Page, minutes = 5) {
  await page.getByRole('button', { name: 'Faire une pause' }).click();
  for (let m = 5; m < minutes; m += 5) {
    await page.getByRole('button', { name: '5 minutes de plus' }).click();
  }
  await page.getByRole('button', { name: 'Lancer' }).click();
  await expect(page.getByRole('dialog', { name: 'Pause' })).toBeVisible();
}

/** Heure figée (Date.now constant) que le test avance à la main ; les timers tournent normalement. */
export async function fixedClock(page: Page, start = T0) {
  let now = start.getTime();
  await page.clock.setFixedTime(now);
  return {
    advance: async (ms: number) => {
      now += ms;
      await page.clock.setFixedTime(now);
    },
  };
}
