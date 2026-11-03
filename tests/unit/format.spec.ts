import { describe, expect, it } from 'vitest';
import {
  deviceTimeZone,
  formatCompass,
  formatDuration,
  formatShadow,
  formatTime,
} from '~/utils/format';

describe('formatCompass', () => {
  it.each([
    [0, 'N'],
    [22.5, 'NNE'],
    [90, 'E'],
    [180, 'S'],
    [270, 'W'],
    [348.75, 'N'],
    [359, 'N'],
    [360, 'N'],
    [-90, 'W'],
  ])('%d degrees is %s', (degrees, expected) => {
    expect(formatCompass(degrees)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it('writes hours and minutes', () => {
    expect(formatDuration(17 * 60 + 43)).toBe('17 h 43 min');
  });

  it('drops hours under one hour and handles zero', () => {
    expect(formatDuration(5)).toBe('5 min');
    expect(formatDuration(0)).toBe('0 min');
  });
});

describe('formatTime', () => {
  it('uses 24 hours in the device zone', () => {
    expect(formatTime(new Date(2026, 5, 21, 13, 7))).toBe('13:07');
    expect(formatTime(new Date(2026, 5, 21, 0, 5))).toBe('00:05');
  });

  it('shows a dash for a missing time', () => {
    expect(formatTime(null)).toBe('-');
  });
});

describe('formatShadow', () => {
  it('says there is no shadow for null', () => {
    expect(formatShadow(null)).toBe('No shadow');
  });

  it('shows metres with sensible precision', () => {
    expect(formatShadow(0.553)).toBe('0.55 m');
    expect(formatShadow(3.94)).toBe('3.9 m');
    expect(formatShadow(48.4)).toBe('48 m');
  });

  it('caps long shadows at "> 1 km"', () => {
    expect(formatShadow(1000)).toBe('1000 m');
    expect(formatShadow(1000.5)).toBe('> 1 km');
    expect(formatShadow(25000)).toBe('> 1 km');
  });
});

describe('deviceTimeZone', () => {
  it('returns the IANA zone the tests run in', () => {
    expect(deviceTimeZone()).toBe('Europe/Amsterdam');
  });
});
