import type { Ref } from 'vue';
import type { LatLon } from '~/types/sun';

export type GeolocationState =
  'idle' | 'pending' | 'granted' | 'denied' | 'unsupported' | 'error';

const PERMISSION_DENIED = 1;
// Low power, a position up to a minute old is fine; never stored
const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 10_000,
};

export const useGeolocation = (): {
  state: Ref<GeolocationState>;
  coords: Ref<LatLon | null>;
  locate: () => void;
} => {
  const state = ref<GeolocationState>('idle');
  const coords = ref<LatLon | null>(null);

  const locate = (): void => {
    if (state.value === 'pending') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      state.value = 'unsupported';
      return;
    }
    state.value = 'pending';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        coords.value = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        state.value = 'granted';
      },
      (error) => {
        state.value = error.code === PERMISSION_DENIED ? 'denied' : 'error';
      },
      POSITION_OPTIONS
    );
  };

  return { state, coords, locate };
};
