import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SunSheet from '~/components/SunSheet.vue';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';

const DAM = { lat: 52.3731, lon: 4.8926 };

const summaryAt = async (moment: Date): Promise<string> => {
  const reading = readSun(moment, DAM.lat, DAM.lon);
  const wrapper = await mountSuspended(SunSheet, {
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
  return wrapper.get('.sheet__summary span:last-child').text();
};

describe('SunSheet collapsed summary', () => {
  it('reads altitude, bearing and shadow with middots while the sun is up', async () => {
    expect(await summaryAt(new Date(2026, 5, 21, 13, 42))).toMatch(
      /^6[01]\.\d° up · 1[78]\d° S · shadow 0\.55 m$/
    );
  });

  it('says the sun is below the horizon, with bearing and no shadow wording', async () => {
    const text = await summaryAt(new Date(2026, 5, 21, 2, 0));
    expect(text).toMatch(/^Sun below the horizon · \d{1,3}° [NESW]{1,3}$/);
    expect(text).not.toContain('shadow');
  });
});
