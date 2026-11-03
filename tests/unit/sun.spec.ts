import { describe, expect, it } from 'vitest';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';

// TZ is pinned to Europe/Amsterdam in vitest.config.ts
const AMSTERDAM = { lat: 52.3731, lon: 4.8926 };
const TROMSO = { lat: 69.65, lon: 18.96 };
const SOLSTICE = new Date(2026, 5, 21, 12, 0);
const WINTER = new Date(2026, 11, 21, 12, 0);

const minutesOfDay = (date: Date | null): number =>
  date ? date.getHours() * 60 + date.getMinutes() : Number.NaN;

describe('readSun', () => {
  it('puts the sun due south at solar noon, 61 degrees high (north-based bearing)', () => {
    const { solarNoon } = getDayTimes(SOLSTICE, AMSTERDAM.lat, AMSTERDAM.lon);
    const { altitudeDeg, bearingDeg } = readSun(
      solarNoon,
      AMSTERDAM.lat,
      AMSTERDAM.lon
    );
    expect(Math.abs(bearingDeg - 180)).toBeLessThanOrEqual(1);
    expect(Math.abs(altitudeDeg - 61.07)).toBeLessThanOrEqual(0.5);
  });

  it('puts the sun in the east in the morning and west in the evening, bearing within 0-360', () => {
    const morning = readSun(
      new Date(2026, 5, 21, 8, 0),
      AMSTERDAM.lat,
      AMSTERDAM.lon
    );
    const evening = readSun(
      new Date(2026, 5, 21, 20, 0),
      AMSTERDAM.lat,
      AMSTERDAM.lon
    );
    expect(morning.bearingDeg).toBeGreaterThan(60);
    expect(morning.bearingDeg).toBeLessThan(120);
    expect(evening.bearingDeg).toBeGreaterThan(240);
    expect(evening.bearingDeg).toBeLessThan(300);
  });
});

describe('getDayTimes', () => {
  it('matches the published Amsterdam sunrise and sunset for 2026-06-21 within 5 minutes', () => {
    // api.sunrise-sunset.org for the Dam, 2026-06-21: sunrise 05:17:59, sunset 22:06:30 CEST (suncalc: 05:18 / 22:06)
    const times = getDayTimes(SOLSTICE, AMSTERDAM.lat, AMSTERDAM.lon);
    expect(times.daylight).toBe('normal');
    expect(
      Math.abs(minutesOfDay(times.sunrise) - (5 * 60 + 18))
    ).toBeLessThanOrEqual(5);
    expect(
      Math.abs(minutesOfDay(times.sunset) - (22 * 60 + 6))
    ).toBeLessThanOrEqual(5);
  });

  it('reports day length in minutes from sunrise to sunset', () => {
    const times = getDayTimes(SOLSTICE, AMSTERDAM.lat, AMSTERDAM.lon);
    // 05:18 to 22:06 is 16 h 48 min
    expect(Math.abs((times.dayLengthMin ?? 0) - 1008)).toBeLessThanOrEqual(8);
  });

  it('orders morning blue hour, sunrise and golden hour end, and mirrors them in the evening', () => {
    const t = getDayTimes(
      new Date(2026, 2, 21, 12, 0),
      AMSTERDAM.lat,
      AMSTERDAM.lon
    );
    const ms = (date: Date | null): number => date?.getTime() ?? Number.NaN;
    expect(ms(t.blueMorning.start)).toBeLessThan(ms(t.blueMorning.end));
    expect(ms(t.blueMorning.end)).toBeLessThan(ms(t.sunrise));
    expect(ms(t.sunrise)).toBeLessThan(ms(t.goldenMorning.end));
    expect(ms(t.goldenEvening.start)).toBeLessThan(ms(t.sunset));
    expect(ms(t.sunset)).toBeLessThan(ms(t.blueEvening.start));
    expect(ms(t.blueEvening.start)).toBeLessThan(ms(t.blueEvening.end));
  });

  it('puts blue hour at sun altitude -4 to -8 degrees', () => {
    const t = getDayTimes(
      new Date(2026, 2, 21, 12, 0),
      AMSTERDAM.lat,
      AMSTERDAM.lon
    );
    const alt = (date: Date | null): number =>
      readSun(date as Date, AMSTERDAM.lat, AMSTERDAM.lon).altitudeDeg;
    expect(alt(t.blueMorning.start)).toBeCloseTo(-8, 1);
    expect(alt(t.blueMorning.end)).toBeCloseTo(-4, 1);
    expect(alt(t.blueEvening.start)).toBeCloseTo(-4, 1);
    expect(alt(t.blueEvening.end)).toBeCloseTo(-8, 1);
  });

  it('does not leak blue hour entries into suncalc between calls', async () => {
    const suncalc = await import('suncalc');
    const before = suncalc.times.length;
    getDayTimes(SOLSTICE, AMSTERDAM.lat, AMSTERDAM.lon);
    getDayTimes(SOLSTICE, AMSTERDAM.lat, AMSTERDAM.lon);
    expect(suncalc.times.length).toBe(before);
  });

  it('flags polar day in Tromsø at the June solstice with null rise and set', () => {
    const t = getDayTimes(SOLSTICE, TROMSO.lat, TROMSO.lon);
    expect(t.daylight).toBe('polar-day');
    expect(t.sunrise).toBeNull();
    expect(t.sunset).toBeNull();
    expect(t.dayLengthMin).toBe(1440);
  });

  it('flags polar night in Tromsø at the December solstice with null rise and set', () => {
    const t = getDayTimes(WINTER, TROMSO.lat, TROMSO.lon);
    expect(t.daylight).toBe('polar-night');
    expect(t.sunrise).toBeNull();
    expect(t.sunset).toBeNull();
    expect(t.dayLengthMin).toBe(0);
  });

  it('never returns an Invalid Date, at the poles or elsewhere', () => {
    const dates = [SOLSTICE, WINTER, new Date(2026, 2, 21, 12, 0)];
    const places = [
      AMSTERDAM,
      TROMSO,
      { lat: 89, lon: 0 },
      { lat: -89, lon: 170 },
    ];
    const all = dates.flatMap((date) =>
      places.flatMap((place) => {
        const t = getDayTimes(date, place.lat, place.lon);
        return [
          t.solarNoon,
          t.sunrise,
          t.sunset,
          t.goldenMorning.start,
          t.goldenMorning.end,
          t.goldenEvening.start,
          t.goldenEvening.end,
          t.blueMorning.start,
          t.blueMorning.end,
          t.blueEvening.start,
          t.blueEvening.end,
        ];
      })
    );
    expect(all.length).toBe(132);
    for (const value of all) {
      if (value !== null) expect(Number.isNaN(value.getTime())).toBe(false);
    }
  });
});

describe('shadowLength', () => {
  it('is 0.553 m for a 1 m object at 61.07 degrees', () => {
    expect(Math.abs((shadowLength(61.07, 1) ?? 0) - 0.553)).toBeLessThanOrEqual(
      0.01
    );
  });

  it('is 3.95 m at 14.19 degrees (Amsterdam winter noon)', () => {
    expect(Math.abs((shadowLength(14.19, 1) ?? 0) - 3.95)).toBeLessThanOrEqual(
      0.1
    );
  });

  it('scales with object height', () => {
    expect(shadowLength(45, 2)).toBeCloseTo(2, 5);
  });

  it('is null when the sun is on or below the horizon', () => {
    expect(shadowLength(0, 1)).toBeNull();
    expect(shadowLength(-5, 1)).toBeNull();
  });
});
