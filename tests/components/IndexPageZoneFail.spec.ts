import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { defineComponent, h, type VNode } from 'vue';
import IndexPage from '~/pages/index.vue';

// The zone chunk can fail to load: offline, or a stale hash after a deploy
vi.mock('~/utils/zoneStart', () => ({
  zonePlace: vi.fn(async (): Promise<null> => {
    throw new Error('chunk load failed');
  }),
}));

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

const coords = (wrapper: VueWrapper): number[] =>
  wrapper
    .findAll('input[type="number"]')
    .map((input) => Number((input.element as HTMLInputElement).value));

describe('IndexPage zone start failure', () => {
  it('keeps the Amsterdam default and announces nothing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await navigateTo('/');
    const wrapper = await mountSuspended(IndexPage, { route: '/' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(coords(wrapper)[0]).toBeCloseTo(52.37, 2);
    expect(coords(wrapper)[1]).toBeCloseTo(4.89, 2);
    expect(wrapper.find('.page__start-note').text()).toBe('');
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
