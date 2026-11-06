import { readSun } from '~/utils/sun';
import type { SkyPathPoint } from '~/types/sky';

const MINUTE_MS = 60_000;
const JUNE_MONTH_INDEX = 5;
const DECEMBER_MONTH_INDEX = 11;
const SOLSTICE_DAY_OF_MONTH = 21;

// Steps in absolute time from local midnight to the next local midnight, so a
// 23 h or 25 h DST day still ends on the next midnight with no repeated samples.
export const sampleSunPath = (
  day: Date,
  lat: number,
  lon: number,
  stepMinutes = 20
): SkyPathPoint[] => {
  const year = day.getFullYear();
  const month = day.getMonth();
  const dayOfMonth = day.getDate();
  const startMs = new Date(year, month, dayOfMonth).getTime();
  const endMs = new Date(year, month, dayOfMonth + 1).getTime();
  const points: SkyPathPoint[] = [];
  for (let ms = startMs; ms <= endMs; ms += stepMinutes * MINUTE_MS) {
    const time = new Date(ms);
    const { altitudeDeg, bearingDeg } = readSun(time, lat, lon);
    points.push({ time, azimuthDeg: bearingDeg, altitudeDeg });
  }
  return points;
};

export const solsticeDays = (year: number): { june: Date; december: Date } => ({
  june: new Date(year, JUNE_MONTH_INDEX, SOLSTICE_DAY_OF_MONTH),
  december: new Date(year, DECEMBER_MONTH_INDEX, SOLSTICE_DAY_OF_MONTH),
});

export const hourMarks = (path: SkyPathPoint[]): SkyPathPoint[] =>
  path.filter(({ time }) => time.getMinutes() === 0 && time.getSeconds() === 0);
