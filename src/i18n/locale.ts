export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** RG16 : une langue navigateur qui commence par `fr` donne le français, sinon l'anglais. */
export function resolveLocale(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
