import { readSun } from '~/utils/sun';
import type {
  CalibrationOffsets,
  CalibrationResult,
  CameraPose,
  SkyDirection,
} from '~/types/sky';

// Offsets live in memory only; the caller owns the state and drops it to reset.
const wrapDegrees = (degrees: number): number => ((degrees % 360) + 360) % 360;

// Shortest signed turn, -180 < result <= 180
const shortestTurnDeg = (degrees: number): number => {
  const wrapped = wrapDegrees(degrees);
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

export const resetCalibration = (): CalibrationOffsets => ({
  headingOffsetDeg: 0,
  pitchOffsetDeg: 0,
});

export const calibrateToSun = (
  raw: Pick<CameraPose, 'headingDeg' | 'pitchDeg'>,
  sunNow: SkyDirection
): CalibrationResult => {
  if (sunNow.altitudeDeg <= 0) return { ok: false, error: 'sun-below-horizon' };
  return {
    ok: true,
    offsets: {
      headingOffsetDeg: shortestTurnDeg(sunNow.azimuthDeg - raw.headingDeg),
      pitchOffsetDeg: sunNow.altitudeDeg - raw.pitchDeg,
    },
  };
};

// Always the sun right now: the URL date may be another day, but the sun the
// user can see in the sky is the one at this instant.
export const calibrateToCurrentSun = (
  raw: Pick<CameraPose, 'headingDeg' | 'pitchDeg'>,
  lat: number,
  lon: number
): CalibrationResult => {
  const { bearingDeg, altitudeDeg } = readSun(new Date(), lat, lon);
  return calibrateToSun(raw, { azimuthDeg: bearingDeg, altitudeDeg });
};

export const applyOffsets = (
  pose: CameraPose,
  offsets: CalibrationOffsets
): CameraPose => ({
  headingDeg: wrapDegrees(pose.headingDeg + offsets.headingOffsetDeg),
  pitchDeg: pose.pitchDeg + offsets.pitchOffsetDeg,
  rollDeg: pose.rollDeg,
});

export const nudge = (offsetDeg: number, step: 1 | -1): number =>
  offsetDeg + step;
