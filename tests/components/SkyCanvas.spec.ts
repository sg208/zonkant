import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import SkyCanvas from '~/components/SkyCanvas.client.vue';

const PROPS = { lat: 52.37, lon: 4.89, date: '2026-06-21' };

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
});
