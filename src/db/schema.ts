import Dexie, { type EntityTable } from 'dexie';
import type { CounterReminder, Locale, Pause, Project, Review, Session } from '../domain/types';

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

/** Réglages typés. Clés de la section 4, plus deux ajouts : defaultPauseMinutes (E7) et
 * pendingReviewSessionId (carte « Faire le bilan » après une clôture automatique, E1). */
export interface SettingsMap {
  locale: Locale;
  remindersEnabled: boolean;
  storagePersisted: boolean;
  onboardingDone: boolean;
  schemaVersion: number;
  defaultPauseMinutes: number;
  pendingReviewSessionId: string;
}

export type SettingKey = keyof SettingsMap;

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
