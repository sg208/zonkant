import type { ViewState } from '~/types/sun';

// Dam Square, Amsterdam
export const DEFAULT_PLACE = { lat: 52.3731, lon: 4.8926 };
const DECIMAL = /^-?\d+(\.\d+)?$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const COORD_DECIMALS = 5;

type RawQuery = Record<string, unknown>;

const pad = (value: number): string => String(value).padStart(2, '0');

const firstString = (value: unknown): string | null => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : null;
};

const parseCoord = (
  value: unknown,
  limit: number,
  fallback: number
): number => {
  const text = firstString(value);
  if (text === null || !DECIMAL.test(text)) return fallback;
  const number = Number(text);
  return Math.abs(number) <= limit ? number : fallback;
};

const parseDate = (value: unknown, fallback: string): string => {
  const match = DATE.exec(firstString(value) ?? '');
  if (!match) return fallback;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  // Round-trip through Date so 2026-02-30 is rejected
  const date = new Date(year, month - 1, day);
  const isReal =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
  return isReal ? `${match[1]}-${match[2]}-${match[3]}` : fallback;
};

const parseTime = (value: unknown, fallback: string): string => {
  const text = firstString(value);
  return text !== null && TIME.test(text) ? text : fallback;
};

// Every field falls back on its own: bad input never throws and never blocks the others
export const parseViewState = (query: RawQuery, now: Date): ViewState => ({
  lat: parseCoord(query.lat, 90, DEFAULT_PLACE.lat),
  lon: parseCoord(query.lon, 180, DEFAULT_PLACE.lon),
  date: parseDate(
    query.date,
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  ),
  time: parseTime(
    query.time,
    `${pad(now.getHours())}:${pad(now.getMinutes())}`
  ),
});

const roundCoord = (value: number): string =>
  String(Number(value.toFixed(COORD_DECIMALS)));

export const toQuery = (state: ViewState): Record<string, string> => ({
  lat: roundCoord(state.lat),
  lon: roundCoord(state.lon),
  date: state.date,
  time: state.time,
});

// Local Date from a validated ViewState; local fields keep the wall clock across DST
export const viewStateToDate = (state: ViewState): Date => {
  const [year = 0, month = 1, day = 1] = state.date.split('-').map(Number);
  const [hours = 0, minutes = 0] = state.time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
};
