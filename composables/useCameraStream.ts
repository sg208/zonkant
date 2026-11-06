import type { Ref, ShallowRef } from 'vue';
import type { SkyAccessStatus } from '~/types/sky';

type CameraStatus = Exclude<SkyAccessStatus, 'no-sensor'>;

const DENIED_ERROR_NAMES = ['NotAllowedError', 'SecurityError'];

// Frames stay in the <video> element: nothing here reads, records or sends them.
export const useCameraStream = (): {
  status: Ref<CameraStatus>;
  stream: ShallowRef<MediaStream | null>;
  start: () => Promise<void>;
  stop: () => void;
} => {
  const status = ref<CameraStatus>('idle');
  const stream = shallowRef<MediaStream | null>(null);
  let runId = 0;

  const stopTracks = (mediaStream: MediaStream): void => {
    for (const track of mediaStream.getTracks()) track.stop();
  };

  const stop = (): void => {
    runId += 1;
    if (stream.value) stopTracks(stream.value);
    stream.value = null;
    status.value = 'idle';
  };

  const start = async (): Promise<void> => {
    if (status.value === 'requesting' || status.value === 'granted') return;
    if (!window.isSecureContext) {
      status.value = 'insecure';
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = 'unsupported';
      return;
    }
    status.value = 'requesting';
    runId += 1;
    const thisRunId = runId;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (thisRunId !== runId) {
        stopTracks(mediaStream);
        return;
      }
      stream.value = mediaStream;
      status.value = 'granted';
    } catch (error) {
      if (thisRunId !== runId) return;
      const errorName = error instanceof Error ? error.name : '';
      status.value = DENIED_ERROR_NAMES.includes(errorName)
        ? 'denied'
        : 'unsupported';
    }
  };

  if (getCurrentScope()) onScopeDispose(stop);

  return { status, stream, start, stop };
};
