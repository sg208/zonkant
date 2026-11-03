import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SunPanel from '~/components/SunPanel.vue';
import type { DayTimes } from '~/types/sun';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';

const DAM = { lat: 52.3731, lon: 4.8926 };
const TROMSO = { lat: 69.65, lon: 18.96 };

const build = async (
  place: { lat: number; lon: number },
  moment: Date,
  overrides: { timeZone?: string } = {}
): Promise<ReturnType<typeof mountSuspended>> => {
  const reading = readSun(moment, place.lat, place.lon);
  const times: DayTimes = getDayTimes(moment, place.lat, place.lon);
  return mountSuspended(SunPanel, {
    props: {
      reading,
      shadowM: shadowLength(reading.altitudeDeg, 1),
      times,
      timeZone: overrides.timeZone ?? 'Europe/Amsterdam',
    },
  });
};

describe('SunPanel', () => {
  it('shows altitude, bearing with compass, 1 m shadow, four times and day length at midday', async () => {
    const wrapper = await build(DAM, new Date(2026, 5, 21, 13, 42));
    const text = wrapper.text();
    expect(text).toMatch(/6[01]\.\d°/);
    expect(text).toMatch(/1[78]\d° S/);
    expect(text).toContain('0.55 m');
    expect(text).toContain('Sunrise');
    expect(text).toContain('Sunset');
    expect(text).toContain('Golden hour');
    expect(text).toContain('Blue hour');
    expect(text).toMatch(/05:1\d/);
    expect(text).toMatch(/22:0\d/);
    expect(text).toContain('16 h 4');
    expect(text).toContain('flat ground, no buildings');
  });

  it('labels the device time zone', async () => {
    const wrapper = await build(DAM, new Date(2026, 5, 21, 13, 42));
    expect(wrapper.text()).toContain('Europe/Amsterdam');
  });

  it('says so in words when the sun is below the horizon, with no blank shadow', async () => {
    const wrapper = await build(DAM, new Date(2026, 5, 21, 2, 0));
    expect(wrapper.text()).toContain('below the horizon');
    expect(wrapper.text()).toContain('No shadow');
  });

  it('says polar day in words and still lists every row with text', async () => {
    const wrapper = await build(TROMSO, new Date(2026, 5, 21, 12, 0));
    const text = wrapper.text();
    expect(text).toContain('Polar day');
    expect(text).toContain('Sun stays up');
    for (const row of wrapper.findAll('dd'))
      expect(row.text().trim()).not.toBe('');
  });

  it('says polar night in words', async () => {
    const wrapper = await build(TROMSO, new Date(2026, 11, 21, 12, 0));
    expect(wrapper.text()).toContain('Polar night');
    expect(wrapper.text()).toContain('Sun stays down');
    for (const row of wrapper.findAll('dd'))
      expect(row.text().trim()).not.toBe('');
  });

  it('says "> 1 km" for a very long shadow', async () => {
    const reading = readSun(new Date(2026, 5, 21, 13, 42), DAM.lat, DAM.lon);
    const wrapper = await mountSuspended(SunPanel, {
      props: {
        reading: { ...reading, altitudeDeg: 0.01 },
        shadowM: 5000,
        times: getDayTimes(new Date(2026, 5, 21, 12), DAM.lat, DAM.lon),
        timeZone: 'Europe/Amsterdam',
      },
    });
    expect(wrapper.text()).toContain('> 1 km');
  });
});
