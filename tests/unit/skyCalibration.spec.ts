import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyOffsets,
  calibrateToCurrentSun,
  calibrateToSun,
  nudge,
  resetCalibration,
} from '~/utils/skyCalibration';
import { readSun } from '~/utils/sun';
import type { CalibrationOffsets } from '~/types/sky';

const expectOffsets = (
  result: ReturnType<typeof calibrateToSun>
): CalibrationOffsets => {
  if (!result.ok) throw new Error(`calibration refused: ${result.error}`);
  return result.offsets;
};

describe('calibrateToSun', () => {
  it('offsets +10 when the sun is at 110 and the compass says 100', () => {
    const result = calibrateToSun(
      { headingDeg: 100, pitchDeg: 30 },
      { azimuthDeg: 110, altitudeDeg: 35 }
    );
    expect(expectOffsets(result)).toEqual({
      headingOffsetDeg: 10,
      pitchOffsetDeg: 5,
    });
  });

  it('takes the short way round north', () => {
    const result = calibrateToSun(
      { headingDeg: 355, pitchDeg: 0 },
      { azimuthDeg: 5, altitudeDeg: 10 }
    );
    expect(expectOffsets(result).headingOffsetDeg).toBe(10);
  });

  it('refuses when the sun is below the horizon', () => {
    const result = calibrateToSun(
      { headingDeg: 100, pitchDeg: 0 },
      { azimuthDeg: 110, altitudeDeg: -3 }
    );
    expect(result).toEqual({ ok: false, error: 'sun-below-horizon' });
  });
});

describe('calibrateToCurrentSun', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the sun at the current time, not a chosen date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 13, 0));
    const lat = 52.37;
    const lon = 4.9;
    const sunNow = readSun(new Date(2026, 5, 21, 13, 0), lat, lon);
    const raw = { headingDeg: 150, pitchDeg: 20 };
    const result = calibrateToCurrentSun(raw, lat, lon);
    const offsets = expectOffsets(result);
    expect(offsets.headingOffsetDeg).toBeCloseTo(sunNow.bearingDeg - 150, 5);
    expect(offsets.pitchOffsetDeg).toBeCloseTo(sunNow.altitudeDeg - 20, 5);
  });

  it('refuses at midnight because the sun is down', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 0, 0));
    const result = calibrateToCurrentSun(
      { headingDeg: 0, pitchDeg: 0 },
      52.37,
      4.9
    );
    expect(result).toEqual({ ok: false, error: 'sun-below-horizon' });
  });
});

describe('applyOffsets', () => {
  it('wraps the heading: 355 + 10 = 5', () => {
    const pose = applyOffsets(
      { headingDeg: 355, pitchDeg: 10, rollDeg: 3 },
      { headingOffsetDeg: 10, pitchOffsetDeg: -4 }
    );
    expect(pose).toEqual({ headingDeg: 5, pitchDeg: 6, rollDeg: 3 });
  });

  it('wraps a negative result: 5 - 10 = 355', () => {
    const pose = applyOffsets(
      { headingDeg: 5, pitchDeg: 0, rollDeg: 0 },
      { headingOffsetDeg: -10, pitchOffsetDeg: 0 }
    );
    expect(pose.headingDeg).toBe(355);
  });
});

describe('nudge and reset', () => {
  it('changes the offset by exactly one degree', () => {
    expect(nudge(10, 1)).toBe(11);
    expect(nudge(10, -1)).toBe(9);
  });

  it('reset clears both offsets', () => {
    expect(resetCalibration()).toEqual({
      headingOffsetDeg: 0,
      pitchOffsetDeg: 0,
    });
  });
});
