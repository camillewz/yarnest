import { HOUR, MIN, at, iso } from '../domain/testing';
import * as repo from './repo';
import { db } from './schema';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const newProject = (name = 'Bonnet côtelé', when = at(0)) => repo.createProject({ name }, when);

describe('projets', () => {
  it('CA1.1 : création en « À faire », compteurs à 0', async () => {
    const id = await repo.createProject(
      { name: '  Bonnet  ', technique: 'knit', note: ' ' },
      at(0),
    );
    expect(await db.projects.get(id)).toEqual({
      id,
      name: 'Bonnet',
      technique: 'knit',
      status: 'todo',
      rowCount: 0,
      stitchCount: 0,
      createdAt: iso(0),
      updatedAt: iso(0),
    });
  });

  it('refuse un nom vide, tronque à 60 caractères', async () => {
    await expect(repo.createProject({ name: '   ' }, at(0))).rejects.toThrow();
    const id = await newProject('x'.repeat(80));
    expect((await db.projects.get(id))?.name).toHaveLength(60);
  });

  it('modification et statut mettent à jour updatedAt', async () => {
    const id = await newProject();
    await repo.updateProject(id, { name: 'Bonnet', technique: 'crochet', status: 'paused' }, at(5));
    expect(await db.projects.get(id)).toMatchObject({
      name: 'Bonnet',
      technique: 'crochet',
      status: 'paused',
      updatedAt: iso(5),
    });
    await repo.updateProject(id, { name: 'Bonnet', note: 'mérinos' }, at(6));
    const p = await db.projects.get(id);
    expect(p?.technique).toBeUndefined();
    expect(p?.note).toBe('mérinos');
    await repo.setProjectStatus(id, 'done', at(7));
    expect(await db.projects.get(id)).toMatchObject({ status: 'done', updatedAt: iso(7) });
  });

  it('CA1.5 : suppression en cascade', async () => {
    const id = await newProject();
    const keep = await newProject('Écharpe');
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.startPause(sessionId!, 5, at(10));
    await repo.endSession(sessionId!, at(20));
    await repo.saveReview(sessionId!, { mood: 4, zones: [] }, at(21));
    await repo.addCounterReminder({ projectId: id, atRow: 10, kind: 'cutYarn' });
    await repo.addCounterReminder({ projectId: keep, atRow: 3, kind: 'increase' });

    await repo.deleteProject(id);

    expect(await db.projects.toCollection().primaryKeys()).toEqual([keep]);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.pauses.count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
    expect(await db.counterReminders.count()).toBe(1);
  });
});

describe('compteurs', () => {
  it('CA4.1 et CA4.2 via la base', async () => {
    const id = await newProject();
    await repo.applyCounter(id, 'decrementRow', at(1));
    for (let i = 0; i < 12; i++) await repo.applyCounter(id, 'incrementStitch', at(1));
    await repo.applyCounter(id, 'incrementRow', at(2));
    expect(await db.projects.get(id)).toMatchObject({
      rowCount: 1,
      stitchCount: 0,
      updatedAt: iso(2),
    });
  });

  it('CA4.5 : 20 taps simultanés → +20 exactement', async () => {
    const id = await newProject();
    await Promise.all(
      Array.from({ length: 20 }, () => repo.applyCounter(id, 'incrementRow', at(1))),
    );
    expect((await db.projects.get(id))?.rowCount).toBe(20);
  });

  it('un tap en session met à jour lastActivityAt', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.applyCounter(id, 'incrementRow', at(42));
    expect((await db.sessions.get(sessionId!))?.lastActivityAt).toBe(iso(42));
  });
});

describe('sessions', () => {
  it('CA2.1 : démarrage, rowsAtStart et passage « En cours »', async () => {
    const id = await newProject();
    for (let i = 0; i < 3; i++) await repo.applyCounter(id, 'incrementRow', at(0));
    const result = await repo.startSession(id, at(1));
    expect(result.kind).toBe('ok');
    expect(await db.sessions.get(result.sessionId!)).toMatchObject({
      projectId: id,
      startedAt: iso(1),
      rowsAtStart: 3,
    });
    expect((await db.projects.get(id))?.status).toBe('active');
  });

  it('CA2.2 : jamais deux sessions ouvertes', async () => {
    const a = await newProject('A');
    const b = await newProject('B');
    const first = await repo.startSession(a, at(0));
    expect((await repo.startSession(a, at(1))).kind).toBe('resume');
    const conflict = await repo.startSession(b, at(1));
    expect(conflict.kind).toBe('conflict');
    expect(await db.sessions.filter((s) => !s.endedAt).count()).toBe(1);
    await repo.endSession(first.sessionId!, at(2));
    expect((await repo.startSession(b, at(3))).kind).toBe('ok');
  });

  it('fin de session : rangs de fin, pause ouverte fermée', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.applyCounter(id, 'incrementRow', at(5));
    await repo.startPause(sessionId!, 5, at(10));
    await repo.endSession(sessionId!, at(12));
    expect(await db.sessions.get(sessionId!)).toMatchObject({
      endedAt: iso(12),
      endReason: 'manual',
      rowsAtEnd: 1,
    });
    expect((await db.pauses.toArray())[0]?.endedAt).toBe(iso(12));
    await repo.endSession(sessionId!, at(30));
    expect((await db.sessions.get(sessionId!))?.endedAt).toBe(iso(12));
  });

  it('une seule pause ouverte ; la pause remet le palier de rappel à 0', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.markReminderShown(sessionId!, 1, at(30));
    await repo.chooseAfterR3(sessionId!, 'stop');
    await repo.startPause(sessionId!, 10, at(31));
    await repo.startPause(sessionId!, 10, at(32));
    expect(await db.pauses.count()).toBe(1);
    expect(await db.sessions.get(sessionId!)).toMatchObject({
      reminderStage: 0,
      remindersMode: 'off',
      lastActivityAt: iso(31),
    });
    await repo.endPause(sessionId!, at(45));
    await repo.endPause(sessionId!, at(50));
    expect((await db.pauses.toArray())[0]?.endedAt).toBe(iso(45));
  });

  it('CA2.6 : clôture automatique après 12 h, bilan en attente', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.applyCounter(id, 'incrementRow', at(30));
    await repo.startPause(sessionId!, 5, at(40));
    expect(await repo.runAutoClose(at(40) + 11 * HOUR)).toBeUndefined();
    expect(await repo.runAutoClose(at(40) + 12 * HOUR + MIN)).toBe(sessionId);
    expect(await db.sessions.get(sessionId!)).toMatchObject({
      endedAt: iso(40),
      endReason: 'auto12h',
      rowsAtEnd: 1,
    });
    expect((await db.pauses.toArray())[0]?.endedAt).toBe(iso(40));
    expect(await repo.getSetting('pendingReviewSessionId')).toBe(sessionId);
    expect(await repo.runAutoClose(at(40) + 13 * HOUR)).toBeUndefined();

    await repo.skipReview(sessionId!);
    expect(await repo.getSetting('pendingReviewSessionId')).toBeUndefined();
  });

  it('CA6.2 et CA6.3 : correction et suppression d’une session', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.startPause(sessionId!, 5, at(10));
    await repo.endSession(sessionId!, at(20));
    await repo.saveReview(sessionId!, { mood: 3, zones: ['neck'], note: 'ok' }, at(21));
    await repo.setManualKnitTime(sessionId!, 1234.4);
    expect((await db.sessions.get(sessionId!))?.manualKnitSeconds).toBe(1234);
    await repo.deleteSession(sessionId!);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.pauses.count()).toBe(0);
    expect(await db.reviews.count()).toBe(0);
  });
});

describe('bilan', () => {
  it('CA5.2 : ressenti seul, zones vides ; mise à jour conserve createdAt', async () => {
    const id = await newProject();
    const { sessionId } = await repo.startSession(id, at(0));
    await repo.endSession(sessionId!, at(20));
    await repo.saveReview(sessionId!, { mood: 4, zones: [] }, at(21));
    expect(await db.reviews.get(sessionId!)).toEqual({
      sessionId,
      mood: 4,
      zones: [],
      createdAt: iso(21),
    });
    await repo.saveReview(sessionId!, { zones: ['eyes'], note: 'fatigue' }, at(99));
    expect(await db.reviews.get(sessionId!)).toEqual({
      sessionId,
      zones: ['eyes'],
      note: 'fatigue',
      createdAt: iso(21),
    });
  });
});

describe('rappels de compteur et réglages', () => {
  it('ajout, fait, suppression', async () => {
    const id = await newProject();
    const rid = await repo.addCounterReminder({
      projectId: id,
      atRow: 12.4,
      kind: 'custom',
      label: ' Torsade ',
    });
    expect(await db.counterReminders.get(rid)).toEqual({
      id: rid,
      projectId: id,
      atRow: 12,
      kind: 'custom',
      label: 'Torsade',
    });
    await repo.markCounterReminderDone(rid, at(3));
    expect((await db.counterReminders.get(rid))?.doneAt).toBe(iso(3));
    await repo.deleteCounterReminder(rid);
    expect(await db.counterReminders.count()).toBe(0);
  });

  it('réglages typés', async () => {
    expect(await repo.getSetting('remindersEnabled')).toBeUndefined();
    await repo.setSetting('remindersEnabled', false);
    expect(await repo.getSetting('remindersEnabled')).toBe(false);
  });
});
