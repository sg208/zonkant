import type { GeocodePlace } from '~/types/geocode';

export const MIN_QUERY_LENGTH = 3;
export const RESULT_LIMIT = 6;

const ENDPOINT = 'https://photon.komoot.io/api/';
const MAX_QUERY_LENGTH = 200;
const LANGUAGES = ['en', 'de', 'fr', 'it'];

export const buildSearchUrl = (
  query: string,
  lang: string,
  limit: number
): string => {
  const safeLang = LANGUAGES.includes(lang) ? lang : 'en';
  const text = encodeURIComponent(query.slice(0, MAX_QUERY_LENGTH));
  return `${ENDPOINT}?q=${text}&limit=${limit}&lang=${safeLang}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isInRange = (value: unknown, limit: number): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Math.abs(value) <= limit;

const buildLabel = (properties: Record<string, unknown>): string => {
  const street = [text(properties.street), text(properties.housenumber)]
    .filter(Boolean)
    .join(' ');
  const parts = [
    text(properties.name) || street,
    text(properties.city),
    text(properties.state),
    text(properties.country),
  ].filter(Boolean);
  return [...new Set(parts)].join(', ');
};

export const parsePhoton = (json: unknown): GeocodePlace[] => {
  if (!isRecord(json) || !Array.isArray(json.features)) return [];
  const places: GeocodePlace[] = [];
  for (const feature of json.features as unknown[]) {
    if (!isRecord(feature)) continue;
    const coordinates = isRecord(feature.geometry)
      ? feature.geometry.coordinates
      : undefined;
    if (!Array.isArray(coordinates)) continue;
    const [lon, lat] = coordinates as unknown[];
    if (!isInRange(lon, 180) || !isInRange(lat, 90)) continue;
    const label = buildLabel(
      isRecord(feature.properties) ? feature.properties : {}
    );
    if (!label) continue;
    places.push({
      id: `place-${places.length}-${lat}-${lon}`,
      label,
      lat,
      lon,
    });
  }
  return places;
};
