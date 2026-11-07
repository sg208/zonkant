import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, type VNode } from 'vue';
import { useAppLocale } from '~/composables/useAppLocale';

// Behaviour protected: the locale + Intl tag every component derives from the route.
// Turns red if: the mapping or the i18n source changes. No other spec covers the composable.
const Probe = defineComponent({
  setup: (): (() => VNode) => {
    const { appLocale, intlTag } = useAppLocale();
    return () => h('p', `${appLocale.value}|${intlTag.value}`);
  },
});

describe('useAppLocale', () => {
  it('reads Dutch from the /nl route', async () => {
    const wrapper = await mountSuspended(Probe, { route: '/nl' });
    expect(wrapper.text()).toBe('nl|nl-NL');
  });

  it('defaults to English in the test config', async () => {
    const wrapper = await mountSuspended(Probe, { route: '/en' });
    expect(wrapper.text()).toBe('en|en-GB');
  });
});
