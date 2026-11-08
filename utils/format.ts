import { wrapDegrees } from '~/utils/angles';
import type { AppLocale } from '~/types/locale';

// Dutch compass names use O (oost) and Z (zuid), not E and S
const COMPASS_POINTS: Record<AppLocale, readonly string[]> = {
  en: [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ],
  nl: [
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
  ],
};
const INTL_TAGS: Record<AppLocale, string> = { nl: 'nl-NL', en: 'en-GB' };

// Strict match keeps regional tags such as nl-NL on English, as before
export const toAppLocale = (locale: string): AppLocale =>
  locale === 'nl' ? 'nl' : 'en';

export const intlTagFor = (locale: AppLocale): string => INTL_TAGS[locale];
const HOUR_UNIT: Record<AppLocale, string> = { nl: 'u', en: 'h' };
const NO_SHADOW: Record<AppLocale, string> = {
  nl: 'Geen schaduw',
  en: 'No shadow',
};
const MAX_SHADOW_M = 1000;

const createTimeFormatter = (locale: AppLocale): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(INTL_TAGS[locale], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

const timeFormatters: Record<AppLocale, Intl.DateTimeFormat> = {
  nl: createTimeFormatter('nl'),
  en: createTimeFormatter('en'),
};

// Fixed decimals with the locale's separator (1,5 in Dutch); no digit grouping
const formatDecimal = (
  value: number,
  decimals: number,
  locale: AppLocale
): string =>
  new Intl.NumberFormat(INTL_TAGS[locale], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value);

export const formatAltitude = (degrees: number, locale: AppLocale): string =>
  `${formatDecimal(degrees, 1, locale)}°`;

// 16-point compass name for a bearing in degrees clockwise from north
export const formatCompass = (degrees: number, locale: AppLocale): string => {
  const points = COMPASS_POINTS[locale];
  const step = 360 / points.length;
  const index = Math.round(wrapDegrees(degrees) / step) % points.length;
  return points[index] ?? 'N';
};

export const formatDuration = (minutes: number, locale: AppLocale): string => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  return hours > 0
    ? `${hours} ${HOUR_UNIT[locale]} ${total % 60} min`
    : `${total} min`;
};

// 24 h clock in the device zone
export const formatTime = (date: Date | null, locale: AppLocale): string =>
  date ? timeFormatters[locale].format(date) : '-';

// Ruling: null keeps returning the "no shadow" words (existing en test asserts
// it); callers may still branch on null and use their own message.
export const formatShadow = (
  meters: number | null,
  locale: AppLocale
): string => {
  if (meters === null) return NO_SHADOW[locale];
  if (meters > MAX_SHADOW_M) return '> 1 km';
  if (meters < 1) return `${formatDecimal(meters, 2, locale)} m`;
  if (meters < 10) return `${formatDecimal(meters, 1, locale)} m`;
  return `${Math.round(meters)} m`;
};

export const deviceTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
