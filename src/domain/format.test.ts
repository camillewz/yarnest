import { formatClock, formatDuration } from './format';
import { HOUR, MIN } from './testing';

describe('formatClock (RG17, session et minuteur)', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [7 * MIN, '07:00'],
    [42 * MIN + 10_000, '42:10'],
    [HOUR - 1, '59:59'],
    [HOUR, '1:00:00'],
    [HOUR + 5 * MIN + 3_000, '1:05:03'],
    [12 * HOUR, '12:00:00'],
    [-5_000, '00:00'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});

describe('formatDuration (RG16, RG17, journal)', () => {
  it.each([
    [0, 'fr', '0 min'],
    [45 * MIN, 'fr', '45 min'],
    [45 * MIN + 59_000, 'fr', '45 min'],
    [HOUR, 'fr', '1 h 00'],
    [HOUR + 5 * MIN, 'fr', '1 h 05'],
    [9 * HOUR + 40 * MIN, 'fr', '9 h 40'],
    [45 * MIN, 'en', '45 min'],
    [HOUR + 5 * MIN, 'en', '1h 05m'],
    [-MIN, 'en', '0 min'],
  ] as const)('%i ms en %s → %s', (ms, locale, expected) => {
    expect(formatDuration(ms, locale)).toBe(expected);
  });
});
