import { describe, expect, it } from 'vitest';
import {
  buildSearchUrl,
  MIN_QUERY_LENGTH,
  parsePhoton,
  RESULT_LIMIT,
} from '~/utils/geocode';

// Shaped like a real Photon response
const photon = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8999, 52.3792] },
      properties: {
        osm_key: 'place',
        osm_value: 'city',
        type: 'city',
        name: 'Amsterdam',
        state: 'North Holland',
        country: 'Netherlands',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8926, 52.3731] },
      properties: {
        osm_key: 'highway',
        osm_value: 'residential',
        type: 'street',
        street: 'Dam',
        housenumber: '1',
        postcode: '1012',
        city: 'Amsterdam',
        state: 'North Holland',
        country: 'Netherlands',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8926, 52.3731] },
      properties: { name: 'Dam', city: 'Amsterdam', country: 'Netherlands' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8, 52.3] },
      properties: { name: 'Amsterdam', city: 'Amsterdam', state: '' },
    },
  ],
};

describe('constants', () => {
  it('pins the limits', () => {
    expect(MIN_QUERY_LENGTH).toBe(3);
    expect(RESULT_LIMIT).toBe(6);
  });
});

describe('buildSearchUrl', () => {
  it('builds the exact Photon URL', () => {
    expect(buildSearchUrl('amst', 'de', 6)).toBe(
      'https://photon.komoot.io/api/?q=amst&limit=6&lang=de'
    );
  });

  it('url-encodes the text', () => {
    expect(buildSearchUrl('Dam 1 & co/ü', 'en', 6)).toBe(
      'https://photon.komoot.io/api/?q=Dam%201%20%26%20co%2F%C3%BC&limit=6&lang=en'
    );
  });

  it('caps the text at 200 characters', () => {
    const url = new URL(buildSearchUrl('a'.repeat(500), 'en', 6));
    expect(url.searchParams.get('q')).toBe('a'.repeat(200));
  });

  it.each([
    ['nl', 'en'],
    ['', 'en'],
    ['fr', 'fr'],
    ['it', 'it'],
  ])('lang %j becomes %s', (lang, expected) => {
    expect(
      new URL(buildSearchUrl('abc', lang, 6)).searchParams.get('lang')
    ).toBe(expected);
  });
});

describe('parsePhoton', () => {
  const places = parsePhoton(photon);

  it('maps [lon, lat] and builds labels without empty or duplicate parts', () => {
    expect(places.map(({ label, lat, lon }) => ({ label, lat, lon }))).toEqual([
      {
        label: 'Amsterdam, North Holland, Netherlands',
        lat: 52.3792,
        lon: 4.8999,
      },
      {
        label: 'Dam 1, Amsterdam, North Holland, Netherlands',
        lat: 52.3731,
        lon: 4.8926,
      },
      { label: 'Dam, Amsterdam, Netherlands', lat: 52.3731, lon: 4.8926 },
      { label: 'Amsterdam', lat: 52.3, lon: 4.8 },
    ]);
  });

  it('gives unique ids, even for duplicate coordinates', () => {
    expect(new Set(places.map((place) => place.id)).size).toBe(4);
  });

  it('drops features with bad coordinates', () => {
    const bad = [
      {},
      { geometry: null },
      { geometry: { coordinates: [4.9] } },
      { geometry: { coordinates: ['4.9', '52.3'] } },
      { geometry: { coordinates: [Number.NaN, 52.3] } },
      { geometry: { coordinates: [4.9, 91] } },
      { geometry: { coordinates: [181, 52] } },
    ].map((feature) => ({ ...feature, properties: { name: 'X' } }));
    expect(parsePhoton({ features: bad })).toEqual([]);
  });

  it.each([null, undefined, 'x', 3, {}, { features: 'no' }, []])(
    'returns [] for malformed input %j',
    (input) => {
      expect(parsePhoton(input)).toEqual([]);
    }
  );

  it('drops features without any label part', () => {
    expect(
      parsePhoton({
        features: [{ geometry: { coordinates: [4, 52] }, properties: {} }],
      })
    ).toEqual([]);
  });
});
