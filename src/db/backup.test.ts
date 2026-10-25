import { at } from '../domain/testing';
import { createBackup, parseBackup, restoreBackup } from './backup';
import * as repo from './repo';
import { db } from './schema';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

async function seed() {
  const id = await repo.createProject({ name: 'Bonnet' }, at(0));
  const { sessionId } = await repo.startSession(id, at(0));
  await repo.startPause(sessionId!, 5, at(10));
  await repo.endSession(sessionId!, at(20));
  await repo.saveReview(sessionId!, { mood: 5, zones: ['hands'] }, at(21));
  await repo.addCounterReminder({ projectId: id, atRow: 8, kind: 'decrease' });
  await repo.setSetting('locale', 'en');
  await repo.setSetting('storagePersisted', true);
  return id;
}

describe('sauvegarde JSON', () => {
  it('aller-retour complet, réglages propres à l’appareil conservés', async () => {
    await seed();
    const backup = await createBackup(at(30));
    expect(backup.exportedAt).toBe(new Date(at(30)).toISOString());
    expect(backup.data.settings.map((s) => s.key)).toEqual(['locale']);

    await Promise.all(db.tables.map((t) => t.clear()));
    await repo.setSetting('storagePersisted', false);
    await repo.createProject({ name: 'À écraser' }, at(0));

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).not.toBeNull();
    await restoreBackup(parsed!);

    expect((await db.projects.toArray()).map((p) => p.name)).toEqual(['Bonnet']);
    expect(await db.sessions.count()).toBe(1);
    expect(await db.pauses.count()).toBe(1);
    expect(await db.reviews.count()).toBe(1);
    expect(await db.counterReminders.count()).toBe(1);
    expect(await repo.getSetting('locale')).toBe('en');
    expect(await repo.getSetting('storagePersisted')).toBe(false);
  });

  it.each([
    ['du texte', 'pas du json'],
    ['un autre JSON', JSON.stringify({ foo: 1 })],
    ['une autre app', JSON.stringify({ app: 'autre', schemaVersion: 1, data: {} })],
    ['une version future', JSON.stringify({ app: 'yarnest', schemaVersion: 99, data: {} })],
    [
      'des lignes mal formées',
      JSON.stringify({
        app: 'yarnest',
        schemaVersion: 1,
        data: { projects: [{ id: 1 }], sessions: [], pauses: [], reviews: [] },
      }),
    ],
  ])('refuse %s', (_label, text) => {
    expect(parseBackup(text)).toBeNull();
  });

  it('accepte une sauvegarde sans rappels de compteur ni réglages', () => {
    const minimal = {
      app: 'yarnest',
      schemaVersion: 1,
      exportedAt: '',
      data: { projects: [], sessions: [], pauses: [], reviews: [] },
    };
    expect(parseBackup(JSON.stringify(minimal))?.data).toMatchObject({
      counterReminders: [],
      settings: [],
    });
  });
});
