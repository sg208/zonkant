import { describe, expect, it } from 'vitest';
import zoneCoords from '~/utils/zoneCoords';

describe('zoneCoords', () => {
  it('has a full table within valid ranges', () => {
    const entries = Object.values(zoneCoords);
    expect(entries.length).toBeGreaterThan(300);
    for (const [lat, lon] of entries) {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lon).toBeGreaterThanOrEqual(-180);
      expect(lon).toBeLessThanOrEqual(180);
    }
  });

  it('places known zones', () => {
    const [nyLat, nyLon] = zoneCoords['America/New_York']!;
    expect(nyLat).toBeCloseTo(40.71, 1);
    expect(nyLon).toBeCloseTo(-74.01, 1);
    expect(zoneCoords['Australia/Sydney']![0]).toBeLessThan(0);
    expect(zoneCoords['Asia/Kolkata']).toBeDefined();
    expect(zoneCoords['Europe/Amsterdam']).toBeDefined();
  });

  it('resolves link aliases to their target', () => {
    expect(zoneCoords['Asia/Calcutta']).toEqual(zoneCoords['Asia/Kolkata']);
  });

  it("keeps each country's own city for zones tz merged by link", () => {
    expect(zoneCoords['Europe/Oslo']![0]).toBeCloseTo(59.92, 1);
    expect(zoneCoords['Africa/Accra']![0]).toBeCloseTo(5.55, 1);
  });

  // tzdata links these backward-merged ids to a neighbouring country's zone;
  // the start place must stay on the id's own city
  it('keeps legacy ids on their own city instead of the link target', () => {
    expect(zoneCoords['Africa/Asmera']).toEqual(zoneCoords['Africa/Asmara']);
    expect(zoneCoords['Pacific/Ponape']).toEqual(zoneCoords['Pacific/Pohnpei']);
    expect(zoneCoords['Pacific/Truk']).toEqual(zoneCoords['Pacific/Chuuk']);
    expect(zoneCoords['Pacific/Yap']).toEqual(zoneCoords['Pacific/Chuuk']);
    expect(zoneCoords['Africa/Asmera']).not.toEqual(
      zoneCoords['Africa/Nairobi']
    );
    expect(zoneCoords['Pacific/Truk']).not.toEqual(
      zoneCoords['Pacific/Port_Moresby']
    );
  });
});
