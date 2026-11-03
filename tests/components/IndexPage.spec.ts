import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, type VNode } from 'vue';
import IndexPage from '~/pages/index.vue';

// Only the map is replaced (OpenLayers needs a real canvas); the stub forwards its props
// to the DOM and lets a test fire `select`.
mockComponent('SunMap', () =>
  defineComponent({
    props: ['point', 'bearings', 'bottomInset'],
    emits: ['select'],
    setup:
      (props, { emit }) =>
      (): VNode =>
        h(
          'div',
          {
            'data-testid': 'map',
            'data-bearings': JSON.stringify(props.bearings),
          },
          [
            h(
              'button',
              {
                type: 'button',
                onClick: () => emit('select', { lat: 48.8584, lon: 2.2945 }),
              },
              'pick'
            ),
          ]
        ),
  })
);

const DAY = '/?lat=52.3731&lon=4.8926&date=2026-06-21&time=13:37';

describe('IndexPage', () => {
  beforeEach(async () => {
    await navigateTo(DAY);
  });

  it('renders exactly one h1 reading Zonkant', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    const headings = wrapper.findAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe('Zonkant');
  });

  it('renders the Dam readout for the URL date and time', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    // Amsterdam 2026-06-21 13:37 CEST: altitude about 61 degrees
    expect(wrapper.text()).toMatch(/Altitude\s*6\d\.\d°/);
    expect(wrapper.text()).toContain('Shadow of 1 m');
    expect(wrapper.find('input[type="range"]').exists()).toBe(true);
  });

  it('moving the slider updates the readout and the URL after the debounce', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    const before = wrapper.text();
    const slider = wrapper.find('input[type="range"]');
    await slider.setValue(String(6 * 60));
    expect(wrapper.text()).not.toBe(before);
    expect(wrapper.text()).toContain('06:00');
    await vi.waitFor(() => expect(useRoute().query.time).toBe('06:00'), {
      timeout: 2000,
    });
  });

  it('draws sun and shadow lines only while the sun is up', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    const up = JSON.parse(
      wrapper.get('[data-testid="map"]').attributes('data-bearings') ?? ''
    );
    expect(up.sun).not.toBeNull();
    expect(up.shadow).toBeCloseTo((up.sun + 180) % 360, 5);
    await wrapper.find('input[type="range"]').setValue('0');
    const down = JSON.parse(
      wrapper.get('[data-testid="map"]').attributes('data-bearings') ?? ''
    );
    expect(down.sun).toBeNull();
    expect(down.shadow).toBeNull();
    expect(down.sunrise).not.toBeNull();
  });

  it('a map select updates the latitude and longitude inputs', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    await wrapper.get('[data-testid="map"] button').trigger('click');
    const values = wrapper
      .findAll('input[type="number"]')
      .map((input) => (input.element as HTMLInputElement).value);
    expect(values).toContain('48.8584');
    expect(values).toContain('2.2945');
  });

  it('renders the legal link row and the source link', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: DAY });
    const nav = wrapper.get('nav[aria-label="Legal"]');
    const hrefs = nav.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/accessibility',
        '/privacy',
        '/terms',
        '/credits',
      ])
    );
    expect(nav.text()).toContain('Source on GitHub');
  });
});
