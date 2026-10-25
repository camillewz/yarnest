import { dueCounterReminders } from './counterReminders';
import type { CounterReminder } from './types';

const reminder = (id: string, atRow: number, doneAt?: string): CounterReminder => ({
  id,
  projectId: 'p1',
  atRow,
  kind: 'decrease',
  ...(doneAt ? { doneAt } : {}),
});

describe('rappels de rangs dus (Should have)', () => {
  const list = [reminder('a', 40), reminder('b', 12), reminder('c', 20, 'fait'), reminder('d', 35)];

  it('rang atteint ou dépassé, pas encore fait, du plus ancien au plus récent', () => {
    expect(dueCounterReminders(list, 36).map((r) => r.id)).toEqual(['b', 'd']);
  });

  it('rien avant le rang prévu', () => {
    expect(dueCounterReminders(list, 11)).toEqual([]);
  });

  it('revenir sous le rang (−1) fait disparaître le rappel', () => {
    expect(dueCounterReminders(list, 39).map((r) => r.id)).toEqual(['b', 'd']);
    expect(dueCounterReminders(list, 40).map((r) => r.id)).toEqual(['b', 'd', 'a']);
  });
});
