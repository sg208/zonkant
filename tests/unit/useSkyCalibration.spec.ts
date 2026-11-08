import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useSkyCalibration } from '~/composables/useSkyCalibration';
import type { OrientationReading } from '~/types/sky';

const AMSTERDAM = { lat: 52.37, lon: 4.9 };
const POSE: OrientationReading = {
  headingDeg: 150,
  pitchDeg: 20,
  rollDeg: 0,
  isRelative: false,
};

const setupCalibration = (
  reading: OrientationReading | null = POSE
): ReturnType<typeof useSkyCalibration> =>
  useSkyCalibration(
    ref(reading),
    () => AMSTERDAM.lat,
    () => AMSTERDAM.lon
  );

describe('useSkyCalibration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts uncalibrated with zero offsets', () => {
    const calibration = setupCalibration();
    expect(calibration.isCalibrated.value).toBe(false);
    expect(calibration.offsets.value).toEqual({
      headingOffsetDeg: 0,
      pitchOffsetDeg: 0,
    });
  });

  it('calibrates to the sun when it is up', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 13, 0));
    const calibration = setupCalibration();
    calibration.handleCalibrate();
    expect(calibration.isCalibrated.value).toBe(true);
    expect(calibration.offsets.value.headingOffsetDeg).not.toBe(0);
    expect(calibration.offsets.value.pitchOffsetDeg).not.toBe(0);
  });

  it('refuses to calibrate when the sun is down', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 0, 0));
    const calibration = setupCalibration();
    calibration.handleCalibrate();
    expect(calibration.isCalibrated.value).toBe(false);
    expect(calibration.offsets.value.headingOffsetDeg).toBe(0);
  });

  it('does nothing without a compass reading', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 13, 0));
    const calibration = setupCalibration(null);
    calibration.handleCalibrate();
    expect(calibration.isCalibrated.value).toBe(false);
  });

  it('nudges the heading by one degree per step', () => {
    const calibration = setupCalibration();
    calibration.handleNudge(1);
    calibration.handleNudge(1);
    calibration.handleNudge(-1);
    expect(calibration.offsets.value.headingOffsetDeg).toBe(1);
    expect(calibration.offsets.value.pitchOffsetDeg).toBe(0);
  });

  it('reset clears offsets and the calibrated flag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 21, 13, 0));
    const calibration = setupCalibration();
    calibration.handleCalibrate();
    calibration.handleReset();
    expect(calibration.isCalibrated.value).toBe(false);
    expect(calibration.offsets.value).toEqual({
      headingOffsetDeg: 0,
      pitchOffsetDeg: 0,
    });
  });
});
