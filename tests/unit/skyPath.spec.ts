import { describe, expect, it } from 'vitest';
import { hourMarks, sampleSunPath, solsticeDays } from '~/utils/skyPath';

const AMSTERDAM = { lat: 52.37, lon: 4.9 };
const SVALBARD = { lat: 78.2, lon: 15.6 };

const maxAltitude = (day: Date): number => {
  const path = sampleSunPath(day, AMSTERDAM.lat, AMSTERDAM.lon, 5);
  return Math.max(...path.map((point) => point.altitudeDeg));
};

describe('sampleSunPath', () => {
  it('peaks at 61 degrees on the Amsterdam summer solstice', () => {
    expect(Math.abs(maxAltitude(new Date(2026, 5, 21)) - 61)).toBeLessThan(0.5);
  });

  it('peaks at 14.2 degrees on the Amsterdam winter solstice', () => {
    expect(Math.abs(maxAltitude(new Date(2026, 11, 21)) - 14.2)).toBeLessThan(
      0.5
    );
  });

  it('gives 73 samples for a 20 minute step on a normal day', () => {
    const path = sampleSunPath(new Date(2026, 5, 21), 52.37, 4.9);
    expect(path).toHaveLength(73);
    expect(path[0]?.time.getTime()).toBe(new Date(2026, 5, 21).getTime());
    expect(path[72]?.time.getTime()).toBe(new Date(2026, 5, 22).getTime());
  });

  it('runs midnight to midnight on the 23 hour DST day without duplicates', () => {
    const path = sampleSunPath(new Date(2026, 2, 29), 52.37, 4.9);
    const times = path.map((point) => point.time.getTime());
    expect(path.length).toBeGreaterThanOrEqual(70);
    expect(path.length).toBeLessThanOrEqual(72);
    expect(new Set(times).size).toBe(times.length);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBe(new Date(2026, 2, 29).getTime());
    expect(times.at(-1)).toBe(new Date(2026, 2, 30).getTime());
  });

  it('keeps the sun up all day in polar day and down all day in polar night', () => {
    const polarDay = sampleSunPath(
      new Date(2026, 5, 21),
      SVALBARD.lat,
      SVALBARD.lon,
      60
    );
    const polarNight = sampleSunPath(
      new Date(2026, 11, 21),
      SVALBARD.lat,
      SVALBARD.lon,
      60
    );
    expect(polarDay.every((point) => point.altitudeDeg > 0)).toBe(true);
    expect(polarNight.every((point) => point.altitudeDeg < 0)).toBe(true);
  });
});

describe('solsticeDays', () => {
  it('returns 21 June and 21 December at local midnight', () => {
    const { june, december } = solsticeDays(2026);
    expect([june.getMonth(), june.getDate(), june.getHours()]).toEqual([
      5, 21, 0,
    ]);
    expect([december.getMonth(), december.getDate()]).toEqual([11, 21]);
  });
});

describe('hourMarks', () => {
  it('keeps only full-hour samples', () => {
    const path = sampleSunPath(new Date(2026, 5, 21), 52.37, 4.9);
    const marks = hourMarks(path);
    expect(marks).toHaveLength(25);
    expect(marks.every((mark) => mark.time.getMinutes() === 0)).toBe(true);
  });

  it('drops samples that are off the hour', () => {
    const path = sampleSunPath(new Date(2026, 5, 21), 52.37, 4.9, 7);
    const marks = hourMarks(path);
    expect(marks.length).toBeLessThan(path.length);
    expect(marks.length).toBeGreaterThan(0);
  });
});
