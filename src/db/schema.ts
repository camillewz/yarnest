import Dexie, { type EntityTable } from 'dexie';
import type { CounterReminder, Pause, Project, Review, Session } from '../domain/types';

export type {
  BodyZone,
  CounterReminder,
  Pause,
  Project,
  ProjectStatus,
  Review,
  Session,
  Technique,
} from '../domain/types';

export type SettingKey =
  'locale' | 'remindersEnabled' | 'storagePersisted' | 'onboardingDone' | 'schemaVersion';

export interface Setting {
  key: SettingKey;
  value: unknown;
}

export const SCHEMA_VERSION = 1;

export type YarnestDB = Dexie & {
  projects: EntityTable<Project, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  pauses: EntityTable<Pause, 'id'>;
  reviews: EntityTable<Review, 'sessionId'>;
  counterReminders: EntityTable<CounterReminder, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

export function createDb(name = 'yarnest'): YarnestDB {
  const db = new Dexie(name) as YarnestDB;
  db.version(SCHEMA_VERSION).stores({
    projects: 'id, status, updatedAt',
    sessions: 'id, projectId, startedAt, endedAt',
    pauses: 'id, sessionId, startedAt',
    reviews: 'sessionId',
    counterReminders: 'id, projectId, atRow',
    settings: 'key',
  });
  return db;
}

export const db = createDb();
