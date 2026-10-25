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
