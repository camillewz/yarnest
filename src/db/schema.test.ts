import { createDb, SCHEMA_VERSION, type Project } from './schema';

describe('schéma Dexie', () => {
  const db = createDb('yarnest-test-schema');

  afterAll(async () => {
    await db.delete();
  });

  it('déclare les six tables de la section 4', async () => {
    await db.open();
    expect(db.verno).toBe(SCHEMA_VERSION);
    expect(db.tables.map((t) => t.name).sort()).toEqual([
      'counterReminders',
      'pauses',
      'projects',
      'reviews',
      'sessions',
      'settings',
    ]);
    expect(db.reviews.schema.primKey.keyPath).toBe('sessionId');
    expect(db.settings.schema.primKey.keyPath).toBe('key');
  });

  it('écrit et relit un projet indexé par statut', async () => {
    const now = '2026-10-25T10:00:00.000Z';
    const project: Project = {
      id: crypto.randomUUID(),
      name: 'Bonnet côtelé',
      status: 'todo',
      rowCount: 0,
      stitchCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.projects.add(project);
    expect(await db.projects.where('status').equals('todo').toArray()).toEqual([project]);
  });
});
