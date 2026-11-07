import { describe, expect, it } from 'vitest';
import {
  accessStatusKey,
  canRetryAccess,
  combineAccessStatus,
  isSensorBlocked,
  showsStartButton,
} from '~/utils/skyAccess';
import type { SkyAccessStatus } from '~/types/sky';

const SENSOR_STATUSES: SkyAccessStatus[] = [
  'idle',
  'requesting',
  'granted',
  'denied',
  'busy',
  'unsupported',
  'insecure',
  'no-sensor',
];

// Each row: camera status, then the combined status for every sensor status
// in SENSOR_STATUSES order. The camera never reports 'no-sensor'.
const COMBINED_BY_CAMERA: [SkyAccessStatus, SkyAccessStatus[]][] = [
  [
    'idle',
    [
      'idle',
      'requesting',
      'idle',
      'denied',
      'busy',
      'unsupported',
      'insecure',
      'no-sensor',
    ],
  ],
  [
    'requesting',
    [
      'requesting',
      'requesting',
      'requesting',
      'denied',
      'busy',
      'unsupported',
      'insecure',
      'no-sensor',
    ],
  ],
  [
    'granted',
    [
      'requesting',
      'requesting',
      'granted',
      'denied',
      'busy',
      'unsupported',
      'insecure',
      'no-sensor',
    ],
  ],
  [
    'denied',
    [
      'denied',
      'denied',
      'denied',
      'denied',
      'denied',
      'denied',
      'denied',
      'denied',
    ],
  ],
  [
    'busy',
    [
      'busy',
      'busy',
      'busy',
      'denied',
      'busy',
      'unsupported',
      'insecure',
      'busy',
    ],
  ],
  [
    'unsupported',
    [
      'unsupported',
      'unsupported',
      'unsupported',
      'denied',
      'unsupported',
      'unsupported',
      'insecure',
      'unsupported',
    ],
  ],
  [
    'insecure',
    [
      'insecure',
      'insecure',
      'insecure',
      'denied',
      'insecure',
      'insecure',
      'insecure',
      'insecure',
    ],
  ],
];

describe('combineAccessStatus', () => {
  for (const [cameraStatus, expectedBySensor] of COMBINED_BY_CAMERA) {
    it.each(
      SENSOR_STATUSES.map((sensorStatus, index) => ({
        sensorStatus,
        expected: expectedBySensor[index],
      }))
    )(
      `camera ${cameraStatus} + sensor $sensorStatus -> $expected`,
      ({ sensorStatus, expected }) => {
        expect(combineAccessStatus(cameraStatus, sensorStatus)).toBe(expected);
      }
    );
  }
});

describe('access predicates', () => {
  it('lets the user retry after denied, no-sensor and busy only', () => {
    expect(canRetryAccess('denied')).toBe(true);
    expect(canRetryAccess('no-sensor')).toBe(true);
    expect(canRetryAccess('busy')).toBe(true);
    expect(canRetryAccess('idle')).toBe(false);
    expect(canRetryAccess('requesting')).toBe(false);
    expect(canRetryAccess('granted')).toBe(false);
    expect(canRetryAccess('unsupported')).toBe(false);
    expect(canRetryAccess('insecure')).toBe(false);
  });

  it('shows the start button when idle or retryable', () => {
    expect(showsStartButton('idle')).toBe(true);
    expect(showsStartButton('denied')).toBe(true);
    expect(showsStartButton('busy')).toBe(true);
    expect(showsStartButton('no-sensor')).toBe(true);
    expect(showsStartButton('requesting')).toBe(false);
    expect(showsStartButton('granted')).toBe(false);
    expect(showsStartButton('unsupported')).toBe(false);
    expect(showsStartButton('insecure')).toBe(false);
  });

  it('treats denied, no-sensor and unsupported sensors as blocked', () => {
    expect(isSensorBlocked('denied')).toBe(true);
    expect(isSensorBlocked('no-sensor')).toBe(true);
    expect(isSensorBlocked('unsupported')).toBe(true);
    expect(isSensorBlocked('idle')).toBe(false);
    expect(isSensorBlocked('requesting')).toBe(false);
    expect(isSensorBlocked('granted')).toBe(false);
    expect(isSensorBlocked('busy')).toBe(false);
    expect(isSensorBlocked('insecure')).toBe(false);
  });
});

describe('accessStatusKey', () => {
  it('maps granted to ready and no-sensor to noSensor', () => {
    expect(accessStatusKey('granted')).toBe('ready');
    expect(accessStatusKey('no-sensor')).toBe('noSensor');
    expect(accessStatusKey('busy')).toBe('busy');
  });
});
