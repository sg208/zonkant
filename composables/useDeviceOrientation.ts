import type { ComputedRef, Ref } from 'vue';
import { normaliseOrientation } from '~/utils/deviceOrientation';
import type {
  OrientationInput,
  OrientationReading,
  SkyAccessStatus,
} from '~/types/sky';

type PermissionAnswer = 'granted' | 'denied';
type PermissionRequester = {
  requestPermission?: () => Promise<PermissionAnswer>;
};
type IosOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

const NO_SENSOR_TIMEOUT_MS = 1500;

const readScreenAngle = (): number => window.screen.orientation?.angle ?? 0;

const toInput = (event: IosOrientationEvent): OrientationInput => ({
  type: event.type,
  alpha: event.alpha,
  beta: event.beta,
  gamma: event.gamma,
  absolute: event.absolute,
  webkitCompassHeading: event.webkitCompassHeading,
});

// iOS shows its permission prompt only for a call made inside a user gesture,
// so start() asks before its first await and nothing runs at setup.
export const useDeviceOrientation = (): {
  status: Ref<SkyAccessStatus>;
  reading: ComputedRef<OrientationReading | null>;
  start: () => Promise<void>;
  stop: () => void;
} => {
  const status = ref<SkyAccessStatus>('idle');
  const latestInput = shallowRef<OrientationInput | null>(null);
  const screenAngle = ref(0);
  const reading = computed(() =>
    latestInput.value
      ? normaliseOrientation(latestInput.value, screenAngle.value)
      : null
  );
  let runId = 0;
  let noSensorTimer: ReturnType<typeof setTimeout> | undefined;
  let hasAbsoluteEvents = false;

  const acceptInput = (input: OrientationInput): void => {
    if (!normaliseOrientation(input, screenAngle.value)) return;
    latestInput.value = input;
    clearTimeout(noSensorTimer);
    status.value = 'granted';
  };

  const handleAbsoluteOrientation = (event: Event): void => {
    hasAbsoluteEvents = true;
    acceptInput(toInput(event as IosOrientationEvent));
  };

  // Chrome fires both events; once the absolute one works the relative one is noise
  const handleRelativeOrientation = (event: Event): void => {
    if (hasAbsoluteEvents) return;
    acceptInput(toInput(event as IosOrientationEvent));
  };

  const handleScreenRotation = (): void => {
    screenAngle.value = readScreenAngle();
  };

  const removeListeners = (): void => {
    clearTimeout(noSensorTimer);
    window.removeEventListener(
      'deviceorientationabsolute',
      handleAbsoluteOrientation
    );
    window.removeEventListener('deviceorientation', handleRelativeOrientation);
    window.screen.orientation?.removeEventListener(
      'change',
      handleScreenRotation
    );
  };

  const stop = (): void => {
    runId += 1;
    removeListeners();
    hasAbsoluteEvents = false;
    latestInput.value = null;
    status.value = 'idle';
  };

  const askIosPermission = async (): Promise<boolean> => {
    const { requestPermission } =
      DeviceOrientationEvent as unknown as PermissionRequester;
    if (typeof requestPermission !== 'function') return true;
    try {
      return (
        (await requestPermission.call(DeviceOrientationEvent)) === 'granted'
      );
    } catch {
      return false;
    }
  };

  const listen = (): void => {
    screenAngle.value = readScreenAngle();
    window.addEventListener(
      'deviceorientationabsolute',
      handleAbsoluteOrientation
    );
    window.addEventListener('deviceorientation', handleRelativeOrientation);
    window.screen.orientation?.addEventListener('change', handleScreenRotation);
    noSensorTimer = setTimeout(() => {
      removeListeners();
      status.value = 'no-sensor';
    }, NO_SENSOR_TIMEOUT_MS);
  };

  const start = async (): Promise<void> => {
    if (status.value === 'requesting' || status.value === 'granted') return;
    if (!window.isSecureContext) {
      status.value = 'insecure';
      return;
    }
    if (typeof DeviceOrientationEvent === 'undefined') {
      status.value = 'unsupported';
      return;
    }
    status.value = 'requesting';
    runId += 1;
    const thisRunId = runId;
    const isAllowed = await askIosPermission();
    if (thisRunId !== runId) return;
    if (!isAllowed) {
      status.value = 'denied';
      return;
    }
    listen();
  };

  if (getCurrentScope()) onScopeDispose(stop);

  return { status, reading, start, stop };
};
