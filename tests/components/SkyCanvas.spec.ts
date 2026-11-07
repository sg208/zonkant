import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import SkyCanvas from '~/components/SkyCanvas.client.vue';

const PROPS = { lat: 52.37, lon: 4.89, date: '2026-06-21' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SkyCanvas focus', () => {
  // The Start button unmounts as soon as the status changes; without a focus
  // target a keyboard user is dropped back on <body>
  it('moves focus to the status line when the Start button disappears', async () => {
    // WHY: focus only lands on an element in the document, so mount attached
    const wrapper: VueWrapper = await mountSuspended(SkyCanvas, {
      props: PROPS,
      attachTo: document.body,
    });
    const start = wrapper.get('.sky-canvas__start');
    (start.element as HTMLButtonElement).focus();
    await start.trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.find('.sky-canvas__start').exists()).toBe(false);
    expect(document.activeElement).toBe(
      wrapper.get('.sky-canvas__status').element
    );
  });

  // Stopping the camera on a blocked sensor unmounts the controls; focus
  // already inside them must not be dropped on <body> either
  it('keeps focus on the status line when a blocked sensor removes the controls', async () => {
    vi.stubGlobal('isSecureContext', true);
    let denyPermission: (answer: string) => void = () => {};
    vi.stubGlobal(
      'DeviceOrientationEvent',
      Object.assign(function DeviceOrientationEvent() {}, {
        requestPermission: (): Promise<string> =>
          new Promise((resolve) => {
            denyPermission = resolve;
          }),
      })
    );
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: {
        // WHY: happy-dom's srcObject setter needs its own MediaStream, but that
        // class ships no getTracks, which the composable iterates
        getUserMedia: vi.fn(async () => {
          const stream = new MediaStream();
          Object.assign(stream, { getTracks: () => [] });
          return stream;
        }),
      },
    });

    const wrapper: VueWrapper = await mountSuspended(SkyCanvas, {
      props: PROPS,
      attachTo: document.body,
    });
    await wrapper.get('.sky-canvas__start').trigger('click');
    await vi.waitFor(() =>
      expect(wrapper.find('.controls').exists()).toBe(true)
    );
    const slider = wrapper.get('.controls input[type="range"]');
    (slider.element as HTMLInputElement).focus();
    expect(document.activeElement).toBe(slider.element);

    denyPermission('denied');
    await vi.waitFor(() =>
      expect(wrapper.find('.controls').exists()).toBe(false)
    );
    expect(document.activeElement).toBe(
      wrapper.get('.sky-canvas__status').element
    );
  });
});
