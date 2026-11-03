import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '~/composables/useGeolocation';

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

const stubGeolocation = (
  getCurrentPosition: (
    success: SuccessCallback,
    error: ErrorCallback,
    options?: PositionOptions
  ) => void
): ReturnType<typeof vi.fn> => {
  const spy = vi.fn(getCurrentPosition);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: spy },
  });
  return spy;
};

const position = (latitude: number, longitude: number): GeolocationPosition =>
  ({
    coords: { latitude, longitude, accuracy: 10 },
    timestamp: 0,
  }) as unknown as GeolocationPosition;

const failure = (code: number): GeolocationPositionError =>
  ({
    code,
    message: 'x',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }) as GeolocationPositionError;

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'geolocation', original);
  else Reflect.deleteProperty(navigator, 'geolocation');
});

describe('useGeolocation', () => {
  it('starts idle with no coordinates', () => {
    const { state, coords } = useGeolocation();
    expect(state.value).toBe('idle');
    expect(coords.value).toBeNull();
  });

  it('sets coords and granted on success, and asks once with low-power options', () => {
    const spy = stubGeolocation((success) =>
      success(position(51.9244, 4.4777))
    );
    const { state, coords, locate } = useGeolocation();
    locate();
    expect(state.value).toBe('granted');
    expect(coords.value).toEqual({ lat: 51.9244, lon: 4.4777 });
    expect(spy).toHaveBeenCalledTimes(1);
    const options = spy.mock.calls[0]?.[2] as PositionOptions;
    expect(options.enableHighAccuracy).toBe(false);
    expect(options.maximumAge).toBeLessThanOrEqual(60_000);
  });

  it('is pending until the browser answers, and ignores a second tap meanwhile', () => {
    const spy = stubGeolocation(() => {});
    const { state, locate } = useGeolocation();
    locate();
    locate();
    expect(state.value).toBe('pending');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('maps code 1 to denied', () => {
    stubGeolocation((_ok, fail) => fail(failure(1)));
    const { state, coords, locate } = useGeolocation();
    locate();
    expect(state.value).toBe('denied');
    expect(coords.value).toBeNull();
  });

  it.each([2, 3])('maps code %d to error', (code) => {
    stubGeolocation((_ok, fail) => fail(failure(code)));
    const { state, locate } = useGeolocation();
    locate();
    expect(state.value).toBe('error');
  });

  it('reports unsupported without navigator.geolocation', () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    const { state, locate } = useGeolocation();
    locate();
    expect(state.value).toBe('unsupported');
  });

  it('stores nothing', () => {
    stubGeolocation((success) => success(position(1, 2)));
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    useGeolocation().locate();
    expect(setItem).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
    setItem.mockRestore();
  });
});
