// Export et import JSON (Should have, E7). Le fichier reprend le schéma tel quel.
import { SCHEMA_VERSION, db, type Setting } from './schema';
import type { CounterReminder, Pause, Project, Review, Session } from '../domain/types';

export interface Backup {
  app: 'yarnest';
  schemaVersion: number;
  exportedAt: string;
  data: {
    projects: Project[];
    sessions: Session[];
    pauses: Pause[];
    reviews: Review[];
    counterReminders: CounterReminder[];
    settings: Setting[];
  };
}

/** Réglages propres à l'appareil, jamais transportés d'un téléphone à l'autre. */
const DEVICE_SETTINGS = new Set(['storagePersisted']);

export async function createBackup(now: number): Promise<Backup> {
  const [projects, sessions, pauses, reviews, counterReminders, settings] = await Promise.all([
    db.projects.toArray(),
    db.sessions.toArray(),
    db.pauses.toArray(),
    db.reviews.toArray(),
    db.counterReminders.toArray(),
    db.settings.toArray(),
  ]);
  return {
    app: 'yarnest',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    data: {
      projects,
      sessions,
      pauses,
      reviews,
      counterReminders,
      settings: settings.filter((s) => !DEVICE_SETTINGS.has(s.key)),
    },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const rowsHave = (rows: unknown, key: string) =>
  Array.isArray(rows) && rows.every((r) => isObject(r) && typeof r[key] === 'string');

/** Vérifie la forme générale d'un fichier ; `null` s'il n'est pas une sauvegarde valide. */
export function parseBackup(text: string): Backup | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw) || raw.app !== 'yarnest' || !isObject(raw.data)) return null;
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion > SCHEMA_VERSION) return null;
  const d = raw.data;
  const ok =
    rowsHave(d.projects, 'id') &&
    rowsHave(d.projects, 'name') &&
    rowsHave(d.sessions, 'id') &&
    rowsHave(d.sessions, 'projectId') &&
    rowsHave(d.pauses, 'id') &&
    rowsHave(d.pauses, 'sessionId') &&
    rowsHave(d.reviews, 'sessionId') &&
    rowsHave(d.counterReminders ?? [], 'id') &&
    rowsHave(d.settings ?? [], 'key');
  if (!ok) return null;
  return {
    ...(raw as unknown as Backup),
    data: {
      ...(d as unknown as Backup['data']),
      counterReminders: (d.counterReminders ?? []) as CounterReminder[],
      settings: (d.settings ?? []) as Setting[],
    },
  };
}

/** Remplace toutes les données par celles de la sauvegarde, dans une seule transaction. */
export async function restoreBackup(backup: Backup): Promise<void> {
  const { data } = backup;
  await db.transaction(
    'rw',
    [db.projects, db.sessions, db.pauses, db.reviews, db.counterReminders, db.settings],
    async () => {
      const deviceSettings = await db.settings.filter((s) => DEVICE_SETTINGS.has(s.key)).toArray();
      await Promise.all(db.tables.map((t) => t.clear()));
      await db.projects.bulkAdd(data.projects);
      await db.sessions.bulkAdd(data.sessions);
      await db.pauses.bulkAdd(data.pauses);
      await db.reviews.bulkAdd(data.reviews);
      await db.counterReminders.bulkAdd(data.counterReminders);
      await db.settings.bulkPut([
        ...data.settings.filter((s) => !DEVICE_SETTINGS.has(s.key)),
        ...deviceSettings,
      ]);
    },
  );
}
