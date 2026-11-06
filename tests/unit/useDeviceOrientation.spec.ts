import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useDeviceOrientation } from '~/composables/useDeviceOrientation';

type PermissionAnswer = 'granted' | 'denied';

const NO_SENSOR_TIMEOUT_MS = 1500;

class FakeScreenOrientation extends EventTarget {
  angle = 0;
}

let screenOrientation: FakeScreenOrientation;
const originalOrientation = Object.getOwnPropertyDescriptor(
  window.screen,
  'orientation'
);

const sendOrientation = (
  type: 'deviceorientation' | 'deviceorientationabsolute',
  values: Record<string, unknown>
): void => {
  const event = new Event(type);
  Object.assign(event, { alpha: 0, beta: 90, gamma: 0, ...values });
  window.dispatchEvent(event);
};

const stubIosPermission = (
  answer: PermissionAnswer
): ReturnType<typeof vi.fn> => {
  const requestPermission = vi.fn(async () => answer);
  vi.stubGlobal(
    'DeviceOrientationEvent',
    Object.assign(function DeviceOrientationEvent() {}, { requestPermission })
  );
  return requestPermission;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('DeviceOrientationEvent', function DeviceOrientationEvent() {});
  screenOrientation = new FakeScreenOrientation();
  Object.defineProperty(window.screen, 'orientation', {
    configurable: true,
    value: screenOrientation,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (originalOrientation) {
    Object.defineProperty(window.screen, 'orientation', originalOrientation);
  } else {
    Reflect.deleteProperty(window.screen, 'orientation');
  }
});

describe('useDeviceOrientation statuses', () => {
  it('starts idle and never asks for permission at setup', () => {
    const requestPermission = stubIosPermission('granted');
    const { status, reading } = useDeviceOrientation();
    expect(status.value).toBe('idle');
    expect(reading.value).toBeNull();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('reports insecure outside a secure context', async () => {
    vi.stubGlobal('isSecureContext', false);
    const { status, start } = useDeviceOrientation();
    await start();
    expect(status.value).toBe('insecure');
  });

  it('reports unsupported without DeviceOrientationEvent', async () => {
    vi.stubGlobal('DeviceOrientationEvent', undefined);
    const { status, start } = useDeviceOrientation();
    await start();
    expect(status.value).toBe('unsupported');
  });

  it('is requesting until the first orientation event, then granted', async () => {
    const { status, reading, start } = useDeviceOrientation();
    await start();
    expect(status.value).toBe('requesting');
    sendOrientation('deviceorientationabsolute', {
      absolute: true,
      alpha: 270,
    });
    expect(status.value).toBe('granted');
    expect(reading.value?.headingDeg).toBeCloseTo(90, 5);
    expect(reading.value?.isRelative).toBe(false);
  });

  it('reports no-sensor when no event arrives within 1500 ms', async () => {
    const { status, start } = useDeviceOrientation();
    await start();
    vi.advanceTimersByTime(NO_SENSOR_TIMEOUT_MS - 1);
    expect(status.value).toBe('requesting');
    vi.advanceTimersByTime(1);
    expect(status.value).toBe('no-sensor');
  });

  it('treats an event with null angles as no sensor', async () => {
    const { status, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientation', {
      alpha: null,
      beta: null,
      gamma: null,
    });
    vi.advanceTimersByTime(NO_SENSOR_TIMEOUT_MS);
    expect(status.value).toBe('no-sensor');
  });
});

describe('useDeviceOrientation permission', () => {
  it('asks iOS for permission only inside start()', async () => {
    const requestPermission = stubIosPermission('granted');
    const { start } = useDeviceOrientation();
    expect(requestPermission).not.toHaveBeenCalled();
    await start();
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('returns denied when iOS refuses, and listens to nothing', async () => {
    stubIosPermission('denied');
    const { status, reading, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientation', { webkitCompassHeading: 90 });
    expect(status.value).toBe('denied');
    expect(reading.value).toBeNull();
  });

  it('returns denied when the permission request throws', async () => {
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(function DeviceOrientationEvent() {}, {
        requestPermission: vi.fn(async () => {
          throw new Error('not in a user gesture');
        }),
      })
    );
    const { status, start } = useDeviceOrientation();
    await start();
    expect(status.value).toBe('denied');
  });

  it('uses webkitCompassHeading on iOS regardless of alpha', async () => {
    stubIosPermission('granted');
    const { reading, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientation', {
      alpha: 200,
      webkitCompassHeading: 90,
    });
    expect(reading.value?.headingDeg).toBe(90);
  });
});

describe('useDeviceOrientation Android sources', () => {
  it('flags a plain deviceorientation event as relative', async () => {
    const { reading, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientation', { absolute: false, alpha: 10 });
    expect(reading.value?.isRelative).toBe(true);
  });

  it('prefers the absolute event once it has arrived', async () => {
    const { reading, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientationabsolute', {
      absolute: true,
      alpha: 270,
    });
    sendOrientation('deviceorientation', { absolute: false, alpha: 10 });
    expect(reading.value?.headingDeg).toBeCloseTo(90, 5);
    expect(reading.value?.isRelative).toBe(false);
  });
});

describe('useDeviceOrientation screen rotation', () => {
  it('recomputes the reading when the screen rotates', async () => {
    const { reading, start } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientationabsolute', {
      absolute: true,
      beta: 0,
      gamma: 0,
    });
    expect(reading.value?.headingDeg).toBeCloseTo(0, 5);
    screenOrientation.angle = 90;
    screenOrientation.dispatchEvent(new Event('change'));
    expect(reading.value?.headingDeg).toBeCloseTo(90, 5);
  });
});

describe('useDeviceOrientation cleanup', () => {
  it('stop() removes the listeners and clears the reading', async () => {
    const { status, reading, start, stop } = useDeviceOrientation();
    await start();
    sendOrientation('deviceorientationabsolute', { absolute: true });
    expect(reading.value).not.toBeNull();
    stop();
    expect(status.value).toBe('idle');
    expect(reading.value).toBeNull();
    sendOrientation('deviceorientationabsolute', { absolute: true });
    expect(reading.value).toBeNull();
  });

  it('stop() cancels the no-sensor timer', async () => {
    const { status, start, stop } = useDeviceOrientation();
    await start();
    stop();
    vi.advanceTimersByTime(NO_SENSOR_TIMEOUT_MS);
    expect(status.value).toBe('idle');
  });

  it('stops listening when the owning scope is disposed', async () => {
    const scope = effectScope();
    const orientation = scope.run(() => useDeviceOrientation());
    if (!orientation) throw new Error('expected the scope to run');
    await orientation.start();
    scope.stop();
    sendOrientation('deviceorientationabsolute', { absolute: true });
    expect(orientation.reading.value).toBeNull();
  });

  it('ignores a permission answer that arrives after stop()', async () => {
    let answerPermission: (answer: PermissionAnswer) => void = () => {};
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(function DeviceOrientationEvent() {}, {
        requestPermission: () =>
          new Promise<PermissionAnswer>((resolve) => {
            answerPermission = resolve;
          }),
      })
    );
    const { status, reading, start, stop } = useDeviceOrientation();
    const pendingStart = start();
    stop();
    answerPermission('granted');
    await pendingStart;
    sendOrientation('deviceorientation', { webkitCompassHeading: 90 });
    expect(status.value).toBe('idle');
    expect(reading.value).toBeNull();
  });
});
