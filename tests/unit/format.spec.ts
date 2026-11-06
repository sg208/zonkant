import { describe, expect, it } from 'vitest';
import {
  deviceTimeZone,
  formatAltitude,
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
    expect(formatCompass(degrees, 'en')).toBe(expected);
  });

  it('names all 16 Dutch points in order', () => {
    const names = Array.from({ length: 16 }, (_, i) =>
      formatCompass(i * 22.5, 'nl')
    );
    expect(names).toEqual([
      'N',
      'NNO',
      'NO',
      'ONO',
      'O',
      'OZO',
      'ZO',
      'ZZO',
      'Z',
      'ZZW',
      'ZW',
      'WZW',
      'W',
      'WNW',
      'NW',
      'NNW',
    ]);
  });

  it('uses Dutch O and Z, not E and S', () => {
    expect(formatCompass(45, 'nl')).toBe('NO');
    expect(formatCompass(90, 'nl')).toBe('O');
    expect(formatCompass(180, 'nl')).toBe('Z');
    expect(formatCompass(-90, 'nl')).toBe('W');
  });
});

describe('formatDuration', () => {
  it('writes hours and minutes', () => {
    expect(formatDuration(17 * 60 + 43, 'en')).toBe('17 h 43 min');
  });

  it('drops hours under one hour and handles zero', () => {
    expect(formatDuration(5, 'en')).toBe('5 min');
    expect(formatDuration(0, 'en')).toBe('0 min');
  });

  it('writes Dutch hours as u', () => {
    expect(formatDuration(125, 'nl')).toBe('2 u 5 min');
    expect(formatDuration(5, 'nl')).toBe('5 min');
  });
});

describe('formatTime', () => {
  it('uses 24 hours in the device zone', () => {
    expect(formatTime(new Date(2026, 5, 21, 13, 7), 'en')).toBe('13:07');
    expect(formatTime(new Date(2026, 5, 21, 0, 5), 'en')).toBe('00:05');
  });

  it('uses 24 hours in Dutch too', () => {
    expect(formatTime(new Date(2026, 5, 21, 13, 7), 'nl')).toBe('13:07');
    expect(formatTime(new Date(2026, 5, 21, 0, 5), 'nl')).toBe('00:05');
  });

  it('shows a dash for a missing time', () => {
    expect(formatTime(null, 'en')).toBe('-');
    expect(formatTime(null, 'nl')).toBe('-');
  });
});

describe('formatShadow', () => {
  it('says there is no shadow for null', () => {
    expect(formatShadow(null, 'en')).toBe('No shadow');
    expect(formatShadow(null, 'nl')).toBe('Geen schaduw');
  });

  it('shows metres with sensible precision', () => {
    expect(formatShadow(0.553, 'en')).toBe('0.55 m');
    expect(formatShadow(3.94, 'en')).toBe('3.9 m');
    expect(formatShadow(48.4, 'en')).toBe('48 m');
  });

  it('uses a decimal comma in Dutch', () => {
    expect(formatShadow(1.5, 'nl')).toBe('1,5 m');
    expect(formatShadow(1.5, 'en')).toBe('1.5 m');
    expect(formatShadow(0.553, 'nl')).toBe('0,55 m');
    expect(formatShadow(48.4, 'nl')).toBe('48 m');
  });

  it('caps long shadows at "> 1 km"', () => {
    expect(formatShadow(1000, 'en')).toBe('1000 m');
    expect(formatShadow(1000, 'nl')).toBe('1000 m');
    expect(formatShadow(1000.5, 'en')).toBe('> 1 km');
    expect(formatShadow(25000, 'en')).toBe('> 1 km');
  });
});

describe('formatAltitude', () => {
  it('writes one decimal and a degree sign with the locale separator', () => {
    expect(formatAltitude(61.04, 'en')).toBe('61.0°');
    expect(formatAltitude(61.04, 'nl')).toBe('61,0°');
    expect(formatAltitude(-3.26, 'nl')).toBe('-3,3°');
  });
});

describe('deviceTimeZone', () => {
  it('returns the IANA zone the tests run in', () => {
    expect(deviceTimeZone()).toBe('Europe/Amsterdam');
  });
});
