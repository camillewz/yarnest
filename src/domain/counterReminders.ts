import type { CounterReminder } from './types';

/** Rappels de rangs à afficher : rang atteint, pas encore marqués faits, par rang croissant. */
export function dueCounterReminders(
  reminders: readonly CounterReminder[],
  rowCount: number,
): CounterReminder[] {
  return reminders
    .filter((r) => !r.doneAt && r.atRow <= rowCount)
    .sort((a, b) => a.atRow - b.atRow);
}
