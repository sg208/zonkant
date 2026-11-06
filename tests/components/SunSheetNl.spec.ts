import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlaceSearch from '~/components/PlaceSearch.vue';
import SunSheet from '~/components/SunSheet.vue';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';

// Behaviour protected: the Dutch strings, aria text and decimal comma; they are
// not covered by the English specs because the test config defaults to en.
const DAM = { lat: 52.3731, lon: 4.8926 };
// Test config makes en the default locale, so Dutch lives under /nl
const DUTCH_ROUTE = '/nl';
const MIDDAY = new Date(2026, 5, 21, 13, 42);

const feature = (name: string, lon: number, lat: number): object => ({
  geometry: { coordinates: [lon, lat] },
  properties: { name, country: 'Nederland' },
});

const mountSheet = async (
  moment: Date
): Promise<Awaited<ReturnType<typeof mountSuspended>>> => {
  const reading = readSun(moment, DAM.lat, DAM.lon);
  return mountSuspended(SunSheet, {
    route: DUTCH_ROUTE,
    props: {
      reading,
      shadowM: shadowLength(reading.altitudeDeg, 1),
      times: getDayTimes(moment, DAM.lat, DAM.lon),
      timeZone: 'Europe/Amsterdam',
      lat: DAM.lat,
      lon: DAM.lon,
      date: '2026-06-21',
      time: '13:42',
    },
  });
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SunSheet in Dutch', () => {
  it('writes the collapsed summary in Dutch with a decimal comma and Dutch compass', async () => {
    const wrapper = await mountSheet(MIDDAY);
    expect(wrapper.get('.sheet__summary span:last-child').text()).toMatch(
      /^6[01],\d° boven de horizon · 1[78]\d° Z · schaduw 0,55 m$/
    );
    expect(wrapper.get('.sheet__big').text()).toMatch(/^6[01],\d°$/);
  });

  it('says the sun is below the horizon in Dutch', async () => {
    const wrapper = await mountSheet(new Date(2026, 5, 21, 2, 0));
    const text = wrapper.get('.sheet__summary span:last-child').text();
    expect(text).toMatch(/^Zon onder de horizon · \d{1,3}° [NOZW]{1,3}$/);
    expect(text).not.toContain('schaduw');
  });

  it('labels controls, the toggle and the legal nav in Dutch', async () => {
    const wrapper = await mountSheet(MIDDAY);
    expect(wrapper.get('.sheet__toggle').text()).toBe('Meer');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Juridisch');
    expect(wrapper.text()).toContain('Zoek een plaats');
    expect(wrapper.text()).toContain('Breedtegraad');
    expect(wrapper.text()).toContain('Mijn locatie');
    expect(wrapper.text()).toContain('Schaduw van 1 m');
    expect(wrapper.text()).toContain('Gouden uur');
    expect(wrapper.text()).toContain('Daglengte');
    expect(wrapper.text()).toContain('Broncode op GitHub');
  });

  it('shows the shadow and day length with Dutch number and unit formats', async () => {
    const text = (await mountSheet(MIDDAY)).text();
    expect(text).toContain('0,55 m');
    expect(text).toMatch(/16 u \d+ min/);
    expect(text).not.toContain('0.55');
  });

  it('links the legal pages in the active locale', async () => {
    const wrapper = await mountSheet(MIDDAY);
    const hrefs = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll('nav a'),
      (link) => link.getAttribute('href')
    );
    expect(hrefs).toContain('/nl/privacy');
    expect(hrefs.some((href) => href?.startsWith('/en'))).toBe(false);
  });
});

describe('PlaceSearch in Dutch', () => {
  const mountWith = async (
    names: string[]
  ): Promise<Awaited<ReturnType<typeof mountSuspended>>> => {
    const features = names.map((name) => feature(name, 4.9, 52.37));
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ features }), { status: 200 })
      )
    );
    const wrapper = await mountSuspended(PlaceSearch, { route: DUTCH_ROUTE });
    vi.useFakeTimers();
    await wrapper.get('input').setValue('amst');
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();
    vi.useRealTimers();
    return wrapper;
  };

  it('announces one result in the singular', async () => {
    const wrapper = await mountWith(['Amsterdam']);
    expect(wrapper.get('[role="status"]').text()).toBe('1 resultaat');
  });

  it('announces several results in the plural', async () => {
    const wrapper = await mountWith(['Amsterdam', 'Amstelveen', 'Amstenrade']);
    expect(wrapper.get('[role="status"]').text()).toBe('3 resultaten');
  });

  it('announces a pick in Dutch', async () => {
    const wrapper = await mountWith(['Amsterdam']);
    const input = wrapper.get('input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Verplaatst naar Amsterdam, Nederland'
    );
  });
});
