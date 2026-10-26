// Petites règles d'affichage de l'accueil et des vignettes, sans dépendance au navigateur.

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Salutation de l'accueil selon l'heure locale (0 à 23). */
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** Nombre de laines de la palette (tokens --yarn-*). */
export const YARN_SWATCH_COUNT = 4;

/** Laine de la vignette d'un projet : dérivée de son identifiant, stable, sans champ stocké. */
export function yarnSwatch(id: string): number {
  // FNV-1a 32 bits.
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % YARN_SWATCH_COUNT;
}
