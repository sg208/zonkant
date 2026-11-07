import { describe, expect, it } from 'vitest';
import { normaliseOrientation } from '~/utils/deviceOrientation';
import type { OrientationInput, OrientationReading } from '~/types/sky';

const read = (
  input: Partial<OrientationInput>,
  screenAngle = 0
): OrientationReading => {
  const reading = normaliseOrientation(
    { alpha: 0, beta: 0, gamma: 0, absolute: true, ...input },
    screenAngle
  );
  if (!reading) throw new Error('expected a reading');
  return reading;
};

describe('normaliseOrientation pitch and roll', () => {
  it('points the camera straight down when the device lies flat', () => {
    expect(read({ beta: 0, gamma: 0 }).pitchDeg).toBeCloseTo(-90, 5);
  });

  it('points the camera at the horizon when the device is upright in portrait', () => {
    const reading = read({ beta: 90, gamma: 0 });
    expect(reading.pitchDeg).toBeCloseTo(0, 5);
    expect(reading.rollDeg).toBeCloseTo(0, 5);
  });

  it('tilts the camera up when the device leans back past upright', () => {
    expect(read({ beta: 120, gamma: 0 }).pitchDeg).toBeCloseTo(30, 5);
  });

  it('reports a 90 degree roll for an upright device turned onto its side', () => {
    // Rear camera level; screen top now points to the right of the view
    const reading = read({ beta: 0, gamma: -90 });
    expect(reading.pitchDeg).toBeCloseTo(0, 5);
    expect(Math.abs(reading.rollDeg)).toBeCloseTo(90, 5);
  });

  it('removes the landscape roll when the screen has rotated with the device', () => {
    const reading = read({ beta: 0, gamma: -90 }, 90);
    expect(Math.abs(reading.rollDeg)).toBeCloseTo(0, 5);
  });
});

describe('normaliseOrientation heading', () => {
  it('turns alpha into a clockwise heading: alpha 270 faces east', () => {
    expect(read({ beta: 90, gamma: 0, alpha: 270 }).headingDeg).toBeCloseTo(
      90,
      5
    );
  });

  it('keeps the heading inside 0-360', () => {
    const heading = read({ beta: 90, gamma: 0, alpha: 0 }).headingDeg;
    expect(heading).toBeGreaterThanOrEqual(0);
    expect(heading).toBeLessThan(360);
    expect(read({ beta: 90, gamma: 0, alpha: 1 }).headingDeg).toBeCloseTo(
      359,
      5
    );
  });

  it('rotates the flat-device heading by the screen angle', () => {
    const portrait = read({ beta: 0, gamma: 0, alpha: 0 }, 0);
    const landscape = read({ beta: 0, gamma: 0, alpha: 0 }, 90);
    expect(portrait.headingDeg).toBeCloseTo(0, 5);
    expect(landscape.headingDeg).toBeCloseTo(90, 5);
  });
});

describe('normaliseOrientation sources', () => {
  it('uses webkitCompassHeading on iOS regardless of alpha', () => {
    const first = read({ beta: 90, alpha: 10, webkitCompassHeading: 90 });
    const second = read({ beta: 90, alpha: 200, webkitCompassHeading: 90 });
    expect(first.headingDeg).toBe(90);
    expect(second.headingDeg).toBe(90);
    expect(first.isRelative).toBe(false);
  });

  it('flags a non-absolute Android event as relative', () => {
    expect(read({ beta: 90, absolute: false }).isRelative).toBe(true);
  });

  it('trusts an absolute event, including one named deviceorientationabsolute', () => {
    expect(read({ beta: 90, absolute: true }).isRelative).toBe(false);
    const named = read({
      beta: 90,
      absolute: false,
      type: 'deviceorientationabsolute',
    });
    expect(named.isRelative).toBe(false);
  });

  it('returns null when the sensor reports no values', () => {
    const reading = normaliseOrientation(
      { alpha: null, beta: null, gamma: null },
      0
    );
    expect(reading).toBeNull();
  });
});
