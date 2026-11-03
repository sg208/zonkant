const COMPASS_POINTS = [
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
] as const;
const MAX_SHADOW_M = 1000;

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// 16-point compass name for a bearing in degrees clockwise from north
export const formatCompass = (degrees: number): string => {
  const step = 360 / COMPASS_POINTS.length;
  const index =
    Math.round((((degrees % 360) + 360) % 360) / step) % COMPASS_POINTS.length;
  return COMPASS_POINTS[index] ?? 'N';
};

export const formatDuration = (minutes: number): string => {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  return hours > 0 ? `${hours} h ${total % 60} min` : `${total} min`;
};

// 24 h clock in the device zone
export const formatTime = (date: Date | null): string =>
  date ? timeFormatter.format(date) : '-';

export const formatShadow = (meters: number | null): string => {
  if (meters === null) return 'No shadow';
  if (meters > MAX_SHADOW_M) return '> 1 km';
  if (meters < 1) return `${meters.toFixed(2)} m`;
  if (meters < 10) return `${meters.toFixed(1)} m`;
  return `${Math.round(meters)} m`;
};

export const deviceTimeZone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;
