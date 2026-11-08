import { getPosition, getTimes } from 'suncalc';
import { wrapDegrees } from '~/utils/angles';
import type { DayTimes, SunReading, TimeRange } from '~/types/sun';

// suncalc 2.x: azimuth is clockwise from north (0 = N, 90 = E, 180 = S), altitude in degrees,
// all Dates are absolute UTC instants (node_modules/suncalc/index.d.ts)
const DAY_MS = 86_400_000;
const BLUE_HOUR_TOP_DEG = -4;
const BLUE_HOUR_BOTTOM_DEG = -8;
const BISECT_STEPS = 24;

export const readSun = (date: Date, lat: number, lon: number): SunReading => {
  const { altitude, azimuth } = getPosition(date, lat, lon);
  return { altitudeDeg: altitude, bearingDeg: wrapDegrees(azimuth) };
};

// Sun altitude rises monotonically nadir -> noon and falls noon -> next nadir, so bisect.
const findCrossing = (
  fromMs: number,
  toMs: number,
  angleDeg: number,
  lat: number,
  lon: number
): Date | null => {
  const altAt = (ms: number): number =>
    getPosition(new Date(ms), lat, lon).altitude - angleDeg;
  const isRising = altAt(toMs) > altAt(fromMs);
  if (altAt(fromMs) * altAt(toMs) > 0) return null;
  let low = fromMs;
  let high = toMs;
  for (let i = 0; i < BISECT_STEPS; i += 1) {
    const mid = (low + high) / 2;
    const isMidAbove = altAt(mid) > 0;
    if (isMidAbove === isRising) high = mid;
    else low = mid;
  }
  return new Date((low + high) / 2);
};

const toRange = (start: Date | null, end: Date | null): TimeRange => ({
  start,
  end,
});

const getDaylight = (
  sunrise: Date | null,
  alwaysUp: boolean | undefined
): DayTimes['daylight'] => {
  if (sunrise) return 'normal';
  return alwaysUp ? 'polar-day' : 'polar-night';
};

const getDayLength = (
  daylight: DayTimes['daylight'],
  sunrise: Date | null,
  sunset: Date | null
): number => {
  if (daylight === 'polar-day') return 1440;
  if (daylight === 'polar-night' || !sunrise || !sunset) return 0;
  return Math.round((sunset.getTime() - sunrise.getTime()) / 60_000);
};

// `date` picks the civil day in the device zone; times come back as UTC instants
export const getDayTimes = (date: Date, lat: number, lon: number): DayTimes => {
  const noon = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0
  );
  const times = getTimes(noon, lat, lon, 0, -noon.getTimezoneOffset());
  const noonMs = times.solarNoon.getTime();
  const nadirBefore = noonMs - DAY_MS / 2;
  const nadirAfter = noonMs + DAY_MS / 2;
  const blueBottomMorning = findCrossing(
    nadirBefore,
    noonMs,
    BLUE_HOUR_BOTTOM_DEG,
    lat,
    lon
  );
  const blueTopMorning = findCrossing(
    nadirBefore,
    noonMs,
    BLUE_HOUR_TOP_DEG,
    lat,
    lon
  );
  const blueTopEvening = findCrossing(
    noonMs,
    nadirAfter,
    BLUE_HOUR_TOP_DEG,
    lat,
    lon
  );
  const blueBottomEvening = findCrossing(
    noonMs,
    nadirAfter,
    BLUE_HOUR_BOTTOM_DEG,
    lat,
    lon
  );
  const daylight = getDaylight(times.sunrise, times.alwaysUp);
  const dayLengthMin = getDayLength(daylight, times.sunrise, times.sunset);

  return {
    solarNoon: times.solarNoon,
    sunrise: times.sunrise,
    sunset: times.sunset,
    goldenMorning: toRange(times.sunrise, times.goldenHourEnd),
    goldenEvening: toRange(times.goldenHour, times.sunset),
    blueMorning: toRange(blueBottomMorning, blueTopMorning),
    blueEvening: toRange(blueTopEvening, blueBottomEvening),
    dayLengthMin,
    daylight,
  };
};

// Flat ground, no buildings; null when the sun is on or below the horizon
export const shadowLength = (
  altitudeDeg: number,
  heightM: number
): number | null => {
  if (altitudeDeg <= 0) return null;
  return heightM / Math.tan((altitudeDeg * Math.PI) / 180);
};
