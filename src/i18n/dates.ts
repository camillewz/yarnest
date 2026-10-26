import type { Locale } from '../domain/types';

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** « aujourd'hui », « hier » ou « 24 oct. », dans le fuseau du téléphone. */
export function dayLabel(
  isoDate: string,
  now: number,
  locale: Locale,
  words: { today: string; yesterday: string },
): string {
  const date = new Date(isoDate);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return words.today;
  if (dayKey(date) === dayKey(yesterday)) return words.yesterday;
  return shortDate(isoDate, locale);
}

export const shortDate = (isoDate: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(isoDate));

/** « Lundi 26 octobre » : date du jour en tête de l'accueil. */
export function longDate(now: number, locale: Locale): string {
  const text = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(now));
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

export interface DaySlot {
  start: number;
  end: number;
  /** Initiale du jour (« L ») et numéro (« 26 »), puis libellé complet pour les lecteurs d'écran. */
  initial: string;
  day: string;
  label: string;
}

/** Les `count` derniers jours, aujourd'hui en dernier, bornés à minuit dans le fuseau du téléphone. */
export function lastDays(now: number, count: number, locale: Locale): DaySlot[] {
  const initial = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
  const label = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric' });
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (count - 1 - i));
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      initial: initial.format(start),
      day: String(start.getDate()),
      label: label.format(start),
    };
  });
}

/** « Lun » et « 26 » : repère de date des lignes du journal. */
export function dayParts(isoDate: string, locale: Locale): { weekday: string; day: string } {
  const date = new Date(isoDate);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    .format(date)
    .replace('.', '');
  return {
    weekday: weekday.charAt(0).toLocaleUpperCase(locale) + weekday.slice(1),
    day: String(date.getDate()),
  };
}
