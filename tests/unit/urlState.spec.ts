import { describe, expect, it } from 'vitest';
import { parseViewState, toQuery, viewStateToDate } from '~/utils/urlState';

const NOW = new Date(2026, 10, 3, 9, 5);
const DEFAULTS = {
  lat: 52.3731,
  lon: 4.8926,
  date: '2026-11-03',
  time: '09:05',
};

describe('parseViewState', () => {
  it('falls back to Dam, today and now for an empty query', () => {
    expect(parseViewState({}, NOW)).toEqual(DEFAULTS);
  });

  it('round-trips a valid state through toQuery', () => {
    const state = {
      lat: 51.9244,
      lon: 4.4777,
      date: '2026-06-21',
      time: '13:37',
    };
    expect(parseViewState(toQuery(state), NOW)).toEqual(state);
  });

  it('accepts negative coordinates and the range edges', () => {
    const query = { lat: '-90', lon: '-180' };
    expect(parseViewState(query, NOW)).toMatchObject({ lat: -90, lon: -180 });
    expect(parseViewState({ lat: '90', lon: '180' }, NOW)).toMatchObject({
      lat: 90,
      lon: 180,
    });
  });

  it.each([
    ['lat out of range', { lat: '91' }],
    ['lat NaN', { lat: 'NaN' }],
    ['lat empty', { lat: '' }],
    ['lat text', { lat: 'abc' }],
    ['lat Infinity', { lat: 'Infinity' }],
    ['lat array of junk', { lat: ['abc', '10'] }],
    ['lat empty array', { lat: [] }],
    ['lat null', { lat: null }],
  ])('%s falls back to the default latitude', (_name, query) => {
    expect(parseViewState(query, NOW).lat).toBe(DEFAULTS.lat);
  });

  it('falls back on lon out of range without touching a valid lat', () => {
    expect(parseViewState({ lat: '10', lon: '181' }, NOW)).toMatchObject({
      lat: 10,
      lon: DEFAULTS.lon,
    });
  });

  it('takes the first value of an array', () => {
    expect(parseViewState({ lat: ['10.5', '20'] }, NOW).lat).toBe(10.5);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-6-1', 'today', '', '20260621'])(
    'date %j falls back to today',
    (date) => {
      expect(parseViewState({ date }, NOW).date).toBe(DEFAULTS.date);
    }
  );

  it('accepts a real leap day', () => {
    expect(parseViewState({ date: '2028-02-29' }, NOW).date).toBe('2028-02-29');
  });

  it.each(['25:00', '12:60', '9:05', '24:00', 'noon', '', '12:5'])(
    'time %j falls back to now',
    (time) => {
      expect(parseViewState({ time }, NOW).time).toBe(DEFAULTS.time);
    }
  );

  it('accepts 00:00 and 23:59', () => {
    expect(parseViewState({ time: '00:00' }, NOW).time).toBe('00:00');
    expect(parseViewState({ time: '23:59' }, NOW).time).toBe('23:59');
  });

  it('ignores unknown params', () => {
    expect(parseViewState({ utm_source: 'x', lat: '10' }, NOW)).toEqual({
      ...DEFAULTS,
      lat: 10,
    });
  });
});

describe('toQuery', () => {
  it('serialises lat and lon with at most 5 decimals', () => {
    const query = toQuery({
      lat: 52.123456789,
      lon: 4.1,
      date: '2026-06-21',
      time: '08:00',
    });
    expect(query).toEqual({
      lat: '52.12346',
      lon: '4.1',
      date: '2026-06-21',
      time: '08:00',
    });
  });
});

describe('viewStateToDate', () => {
  it('builds a local Date from the date and time fields', () => {
    const date = viewStateToDate({
      ...DEFAULTS,
      date: '2026-06-21',
      time: '13:37',
    });
    expect([
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
    ]).toEqual([2026, 5, 21, 13, 37]);
  });

  it('keeps wall-clock time across the spring DST gap day', () => {
    const date = viewStateToDate({
      ...DEFAULTS,
      date: '2026-03-29',
      time: '12:00',
    });
    expect(date.getHours()).toBe(12);
  });
});
