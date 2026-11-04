import type { LatLon } from '~/types/sun';

// The zone that already is the default place; nothing to move
const DEFAULT_ZONE = 'Europe/Amsterdam';

// WHY: dynamic import keeps the zone table out of the entry chunk
export const zonePlace = async (zone: string): Promise<LatLon | null> => {
  if (!zone || zone === DEFAULT_ZONE) return null;
  const { default: zoneCoords } = await import('~/utils/zoneCoords');
  const coords = zoneCoords[zone];
  return coords ? { lat: coords[0], lon: coords[1] } : null;
};
