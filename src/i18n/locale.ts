import type { Locale } from '../domain/types';

export type { Locale };
export const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'en'];

/** RG16 : une langue navigateur qui commence par `fr` donne le français, sinon l'anglais. */
export function resolveLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
