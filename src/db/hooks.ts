import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_PAUSE_MINUTES } from '../domain/pauses';
import type { Project, Session } from '../domain/types';
import { db, type SettingKey, type SettingsMap } from './schema';

/** `undefined` pendant le chargement ; `{ value: undefined }` si l'élément n'existe pas. */
type Loaded<T> = { value: T } | undefined;

export const useProjects = () =>
  useLiveQuery(() => db.projects.orderBy('updatedAt').reverse().toArray());

/** useLiveQuery renvoie l'ancien résultat tant que la requête d'un nouvel id n'a pas répondu :
 * on ne le retient que s'il correspond bien à l'id demandé. */
function useById<T>(id: string | undefined, get: (id: string) => Promise<T | undefined>) {
  const result = useLiveQuery(async () => ({ id, value: id ? await get(id) : undefined }), [id]);
  return result && result.id === id ? { value: result.value } : undefined;
}

export const useProject = (id: string | undefined): Loaded<Project | undefined> =>
  useById(id, (key) => db.projects.get(key));

export const useActiveSession = () =>
  useLiveQuery(async () => ({ value: await db.sessions.filter((s) => !s.endedAt).first() }));

export const useSession = (id: string | undefined): Loaded<Session | undefined> =>
  useById(id, (key) => db.sessions.get(key));

export const usePauses = (sessionId: string | undefined) =>
  useById(sessionId, (key) => db.pauses.where('sessionId').equals(key).toArray())?.value;

/** Sessions, pauses et bilans d'un projet (journal E3). */
export const useProjectHistory = (projectId: string | undefined) =>
  useById(projectId, async (key) => {
    const sessions = await db.sessions.where('projectId').equals(key).toArray();
    const ids = sessions.map((s) => s.id);
    const [pauses, reviews] = await Promise.all([
      db.pauses.where('sessionId').anyOf(ids).toArray(),
      db.reviews.bulkGet(ids),
    ]);
    return { sessions, pauses, reviews: reviews.filter((r) => r !== undefined) };
  })?.value;

/** Toutes les sessions et pauses (dernière activité des cartes E1). */
export const useAllHistory = () =>
  useLiveQuery(async () => {
    const [sessions, pauses] = await Promise.all([db.sessions.toArray(), db.pauses.toArray()]);
    return { sessions, pauses };
  });

/** Sessions, pauses et bilans de tous les projets (journal global). */
export const useAllJournal = () =>
  useLiveQuery(async () => {
    const [sessions, pauses, reviews] = await Promise.all([
      db.sessions.toArray(),
      db.pauses.toArray(),
      db.reviews.toArray(),
    ]);
    return { sessions, pauses, reviews };
  });

export const useCounterReminders = (projectId: string | undefined) =>
  useById(projectId, (key) => db.counterReminders.where('projectId').equals(key).sortBy('atRow'))
    ?.value;

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

export const useReview = (sessionId: string | undefined) =>
  useById(sessionId, (key) => db.reviews.get(key));
