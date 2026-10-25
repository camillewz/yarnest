import type { Locale } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** RG17 : moins d'1 h → mm:ss ; 1 h et plus → h:mm:ss (session, minuteur). */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** RG16, RG17 : durée du journal, « 1 h 05 » (fr) ou « 1h 05m » (en), « 45 min » sous l'heure. */
export function formatDuration(ms: number, locale: Locale): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return locale === 'fr' ? `${h} h ${pad(m)}` : `${h}h ${pad(m)}m`;
}
