import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { usePageHead } from '~/composables/usePageHead';

const HeadProbe = defineComponent({
  setup: (): (() => null) => {
    usePageHead({
      titleKey: 'privacy.title',
      descriptionKey: 'privacy.description',
    });
    return () => null;
  },
});

describe('usePageHead', () => {
  it('sets the translated title with the site suffix and the description meta', async () => {
    await mountSuspended(HeadProbe);

    await vi.waitFor(
      () => {
        expect(document.title).toBe('Privacy - Zonkant');
      },
      { timeout: 2000 }
    );
    const description = document.head
      .querySelector('meta[name="description"]')
      ?.getAttribute('content');
    expect(description).toBe(
      'Zonkant sets no cookies, has no tracking and stores nothing in your browser. Your location stays on your device.'
    );
  });
});
