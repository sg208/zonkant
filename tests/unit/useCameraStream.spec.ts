import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useCameraStream } from '~/composables/useCameraStream';

const fakeStream = (): {
  stream: MediaStream;
  stopTrack: () => void;
  emitEnded: () => void;
} => {
  const stopTrack = vi.fn();
  const listeners: Record<string, (() => void)[]> = {};
  const track = {
    stop: stopTrack,
    addEventListener: (type: string, listener: () => void): void => {
      (listeners[type] ??= []).push(listener);
    },
  };
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;
  const emitEnded = (): void => {
    for (const listener of listeners.ended ?? []) listener();
  };
  return { stream, stopTrack, emitEnded };
};

const stubGetUserMedia = (
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>
): ReturnType<typeof vi.fn> => {
  const spy = vi.fn(getUserMedia);
  vi.stubGlobal('navigator', {
    ...navigator,
    mediaDevices: { getUserMedia: spy },
  });
  return spy;
};

const domError = (name: string): Error => {
  const error = new Error(name);
  error.name = name;
  return error;
};

beforeEach(() => {
  vi.stubGlobal('isSecureContext', true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCameraStream', () => {
  it('starts idle and does not touch the camera at setup', () => {
    const spy = stubGetUserMedia(async () => fakeStream().stream);
    const { status, stream } = useCameraStream();
    expect(status.value).toBe('idle');
    expect(stream.value).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('asks for the rear camera, video only, and is granted with the stream', async () => {
    const { stream: mediaStream } = fakeStream();
    const spy = stubGetUserMedia(async () => mediaStream);
    const { status, stream, start } = useCameraStream();
    const pendingStart = start();
    expect(status.value).toBe('requesting');
    await pendingStart;
    expect(status.value).toBe('granted');
    expect(stream.value).toBe(mediaStream);
    expect(spy).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
  });

  it('reports denied for NotAllowedError', async () => {
    stubGetUserMedia(async () => {
      throw domError('NotAllowedError');
    });
    const { status, stream, start } = useCameraStream();
    await start();
    expect(status.value).toBe('denied');
    expect(stream.value).toBeNull();
  });

  it('reports unsupported when there is no mediaDevices', async () => {
    vi.stubGlobal('navigator', { ...navigator, mediaDevices: undefined });
    const { status, start } = useCameraStream();
    await start();
    expect(status.value).toBe('unsupported');
  });

  it('reports unsupported when no camera is found', async () => {
    stubGetUserMedia(async () => {
      throw domError('NotFoundError');
    });
    const { status, start } = useCameraStream();
    await start();
    expect(status.value).toBe('unsupported');
  });

  it('reports busy when another app holds the camera, so it can be retried', async () => {
    stubGetUserMedia(async () => {
      throw domError('NotReadableError');
    });
    const { status, start } = useCameraStream();
    await start();
    expect(status.value).toBe('busy');
  });

  it('reports insecure outside a secure context, without asking', async () => {
    vi.stubGlobal('isSecureContext', false);
    const spy = stubGetUserMedia(async () => fakeStream().stream);
    const { status, start } = useCameraStream();
    await start();
    expect(status.value).toBe('insecure');
    expect(spy).not.toHaveBeenCalled();
  });

  it('drops to idle when the system ends the track', async () => {
    const { stream: mediaStream, emitEnded } = fakeStream();
    stubGetUserMedia(async () => mediaStream);
    const { status, stream, start } = useCameraStream();
    await start();
    expect(status.value).toBe('granted');
    emitEnded();
    expect(status.value).toBe('idle');
    expect(stream.value).toBeNull();
  });

  it('stop() stops every track and clears the stream', async () => {
    const { stream: mediaStream, stopTrack } = fakeStream();
    stubGetUserMedia(async () => mediaStream);
    const { status, stream, start, stop } = useCameraStream();
    await start();
    expect(stopTrack).not.toHaveBeenCalled();
    stop();
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(stream.value).toBeNull();
    expect(status.value).toBe('idle');
  });

  it('stops the tracks when the owning scope is disposed', async () => {
    const { stream: mediaStream, stopTrack } = fakeStream();
    stubGetUserMedia(async () => mediaStream);
    const scope = effectScope();
    const camera = scope.run(() => useCameraStream());
    if (!camera) throw new Error('expected the scope to run');
    await camera.start();
    scope.stop();
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it('stops a stream that arrives after stop()', async () => {
    const { stream: mediaStream, stopTrack } = fakeStream();
    let deliverStream: (stream: MediaStream) => void = () => {};
    stubGetUserMedia(
      () =>
        new Promise<MediaStream>((resolve) => {
          deliverStream = resolve;
        })
    );
    const { status, stream, start, stop } = useCameraStream();
    const pendingStart = start();
    stop();
    deliverStream(mediaStream);
    await pendingStart;
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(stream.value).toBeNull();
    expect(status.value).toBe('idle');
  });
});
