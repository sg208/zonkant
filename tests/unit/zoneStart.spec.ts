import { describe, expect, it } from 'vitest';
import { zonePlace } from '~/utils/zoneStart';

describe('zonePlace', () => {
  it('returns the zone location', async () => {
    const place = await zonePlace('America/New_York');
    expect(place?.lat).toBeCloseTo(40.71, 1);
    expect(place?.lon).toBeCloseTo(-74.01, 1);
  });

  it.each(['Europe/Amsterdam', 'UTC', 'Nope/Nowhere', ''])(
    'returns null for %j',
    async (zone) => {
      expect(await zonePlace(zone)).toBeNull();
    }
  );
});
