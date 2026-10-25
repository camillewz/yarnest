import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { resolveLocale, type Locale } from './locale';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
} as const;

export function initI18n(locale: Locale = resolveLocale(navigator.language)) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
  document.documentElement.lang = locale;
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
  return i18n;
}

export default i18n;
