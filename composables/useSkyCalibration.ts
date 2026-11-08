import type { Ref } from 'vue';
import type { CalibrationOffsets, OrientationReading } from '~/types/sky';
import {
  calibrateToCurrentSun,
  nudge,
  resetCalibration,
} from '~/utils/skyCalibration';

interface SkyCalibration {
  offsets: Ref<CalibrationOffsets>;
  isCalibrated: Ref<boolean>;
  handleCalibrate: () => void;
  handleNudge: (step: 1 | -1) => void;
  handleReset: () => void;
}

export const useSkyCalibration = (
  reading: Readonly<Ref<OrientationReading | null>>,
  getLat: () => number,
  getLon: () => number
): SkyCalibration => {
  const offsets = ref<CalibrationOffsets>(resetCalibration());
  const isCalibrated = ref(false);

  const handleCalibrate = (): void => {
    const raw = reading.value;
    if (!raw) return;
    const result = calibrateToCurrentSun(raw, getLat(), getLon());
    if (!result.ok) return;
    offsets.value = result.offsets;
    isCalibrated.value = true;
  };

  const handleNudge = (step: 1 | -1): void => {
    offsets.value = {
      ...offsets.value,
      headingOffsetDeg: nudge(offsets.value.headingOffsetDeg, step),
    };
  };

  const handleReset = (): void => {
    offsets.value = resetCalibration();
    isCalibrated.value = false;
  };

  return { offsets, isCalibrated, handleCalibrate, handleNudge, handleReset };
};
