import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type VNode } from 'vue';
import IndexPage from '~/pages/index.vue';

// The device zone is a system boundary: pin it so the test does not depend on the runner.
vi.mock('~/utils/format', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/utils/format')>()),
  deviceTimeZone: (): string => 'America/New_York',
}));

mockComponent('SunMap', () =>
  defineComponent({
    props: ['point', 'bearings', 'bottomInset'],
    setup: (): (() => VNode) => () => h('div'),
  })
);

const DAY = '/?lat=52.3731&lon=4.8926&date=2026-06-21&time=13:37';
const WRITE_WAIT_MS = 600;

const coords = (wrapper: VueWrapper): number[] =>
  wrapper
    .findAll('input[type="number"]')
    .map((input) => Number((input.element as HTMLInputElement).value));

describe('IndexPage time-zone start', () => {
  let replace: ReturnType<typeof vi.spyOn>;

  // WHY: spy after navigateTo and mountSuspended, which call router.replace for their own setup; a zone-move write would land 300 ms later
  const spyOnReplace = (): void => {
    replace = vi.spyOn(useRouter(), 'replace');
  };

  afterEach(() => {
    replace?.mockRestore();
  });

  it('moves a bare URL to the zone location without writing the URL', async () => {
    await navigateTo('/');
    const wrapper = await mountSuspended(IndexPage, { route: '/' });
    spyOnReplace();
    await vi.waitFor(() => expect(coords(wrapper)[0]).toBeCloseTo(40.7, 1));
    expect(coords(wrapper)[1]).toBeCloseTo(-74.0, 1);
    // WHY: real wait, past the 300 ms write debounce, to prove no write is scheduled
    await new Promise((resolve) => setTimeout(resolve, WRITE_WAIT_MS));
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the URL place when the URL has lat and lon', async () => {
    await navigateTo(DAY);
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(coords(wrapper).slice(0, 2)).toEqual([52.3731, 4.8926]);
  });
});
