import { describe, expect, it } from 'vitest';
import {
  padTwoDigits,
  parseClockText,
  parseDateText,
  toClockText,
  toDateText,
} from '~/utils/dateText';

// Behavior protected: one shared local-date text format for URL state, controls and tables.
// Turns red if: padding, month offset or local-vs-UTC handling regresses.
// Not caught elsewhere: the helpers are new; urlState specs only cover them indirectly.
describe('dateText', () => {
  it('pads to two digits', () => {
    expect(padTwoDigits(5)).toBe('05');
    expect(padTwoDigits(12)).toBe('12');
  });

  it('formats local date and clock with zero padding', () => {
    const date = new Date(2026, 0, 5, 9, 5);
    expect(toDateText(date)).toBe('2026-01-05');
    expect(toClockText(date)).toBe('09:05');
  });

  it('parses a date to local midnight', () => {
    const date = parseDateText('2026-06-21');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(0);
  });

  it('keeps the calendar day on the DST change day', () => {
    const date = parseDateText('2026-03-29');
    expect(date.getDate()).toBe(29);
    expect(toDateText(date)).toBe('2026-03-29');
  });

  it('parses a clock text', () => {
    expect(parseClockText('09:05')).toEqual({ hours: 9, minutes: 5 });
  });
});
