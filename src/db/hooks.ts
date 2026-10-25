import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_PAUSE_MINUTES } from '../domain/pauses';
import type { Project } from '../domain/types';
import { db, type SettingKey, type SettingsMap } from './schema';

/** `undefined` pendant le chargement ; `{ value: undefined }` si l'élément n'existe pas. */
type Loaded<T> = { value: T } | undefined;

export const useProjects = () =>
  useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray());

export const useProject = (id: string | undefined): Loaded<Project | undefined> =>
  useLiveQuery(async () => ({ value: id ? await db.projects.get(id) : undefined }), [id]);

export const useActiveSession = () =>
  useLiveQuery(async () => ({ value: await db.sessions.filter((s) => !s.endedAt).first() }));

export const useSession = (id: string | undefined) =>
  useLiveQuery(async () => ({ value: id ? await db.sessions.get(id) : undefined }), [id]);

export const usePauses = (sessionId: string | undefined) =>
  useLiveQuery(
    () => (sessionId ? db.pauses.where('sessionId').equals(sessionId).toArray() : []),
    [sessionId],
  );

/** Sessions, pauses et bilans d'un projet (journal E3). */
export const useProjectHistory = (projectId: string | undefined) =>
  useLiveQuery(async () => {
    if (!projectId) return { sessions: [], pauses: [], reviews: [] };
    const sessions = await db.sessions.where('projectId').equals(projectId).toArray();
    const ids = sessions.map((s) => s.id);
    const [pauses, reviews] = await Promise.all([
      db.pauses.where('sessionId').anyOf(ids).toArray(),
      db.reviews.bulkGet(ids),
    ]);
    return { sessions, pauses, reviews: reviews.filter((r) => r !== undefined) };
  }, [projectId]);

/** Toutes les sessions et pauses (dernière activité des cartes E1). */
export const useAllHistory = () =>
  useLiveQuery(async () => {
    const [sessions, pauses] = await Promise.all([db.sessions.toArray(), db.pauses.toArray()]);
    return { sessions, pauses };
  });

export const useCounterReminders = (projectId: string | undefined) =>
  useLiveQuery(
    () =>
      projectId ? db.counterReminders.where('projectId').equals(projectId).sortBy('atRow') : [],
    [projectId],
  );

const DEFAULTS: Partial<SettingsMap> = {
  remindersEnabled: true,
  defaultPauseMinutes: DEFAULT_PAUSE_MINUTES,
};

/** Valeur d'un réglage, avec son défaut ; `undefined` pendant le chargement. */
export function useSetting<K extends SettingKey>(key: K): Loaded<SettingsMap[K] | undefined> {
  return useLiveQuery(async () => {
    const stored = await db.settings.get(key);
    return { value: (stored?.value as SettingsMap[K] | undefined) ?? DEFAULTS[key] };
  }, [key]);
}
