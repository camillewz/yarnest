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
