import type { SkyAccessStatus } from '~/types/sky';

const TERMINAL_STATUSES = [
  'denied',
  'insecure',
  'unsupported',
  'busy',
] as const;
const RETRYABLE_STATUSES: SkyAccessStatus[] = ['denied', 'no-sensor', 'busy'];

// The camera is only useful while the sensor works: a blocked sensor would
// leave it streaming with no overlay, so the stage and controls go with it
const BLOCKED_SENSOR_STATUSES: SkyAccessStatus[] = [
  'denied',
  'no-sensor',
  'unsupported',
];

const STATUS_KEYS: Record<SkyAccessStatus, string> = {
  idle: 'idle',
  requesting: 'requesting',
  granted: 'ready',
  denied: 'denied',
  busy: 'busy',
  unsupported: 'unsupported',
  insecure: 'insecure',
  'no-sensor': 'noSensor',
};

export const combineAccessStatus = (
  cameraStatus: SkyAccessStatus,
  sensorStatus: SkyAccessStatus
): SkyAccessStatus => {
  for (const terminal of TERMINAL_STATUSES) {
    if (cameraStatus === terminal || sensorStatus === terminal) return terminal;
  }
  if (sensorStatus === 'no-sensor') return 'no-sensor';
  if (cameraStatus === 'requesting' || sensorStatus === 'requesting')
    return 'requesting';
  if (cameraStatus === 'granted' && sensorStatus === 'granted')
    return 'granted';
  // Camera is on and the first compass reading has not arrived yet
  return cameraStatus === 'granted' ? 'requesting' : 'idle';
};

export const accessStatusKey = (status: SkyAccessStatus): string =>
  STATUS_KEYS[status];

export const canRetryAccess = (status: SkyAccessStatus): boolean =>
  RETRYABLE_STATUSES.includes(status);

export const showsStartButton = (status: SkyAccessStatus): boolean =>
  status === 'idle' || canRetryAccess(status);

export const isSensorBlocked = (sensorStatus: SkyAccessStatus): boolean =>
  BLOCKED_SENSOR_STATUSES.includes(sensorStatus);
