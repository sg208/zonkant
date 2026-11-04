import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import SunSheet from '~/components/SunSheet.vue';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';

const DAM = { lat: 52.3731, lon: 4.8926 };

const mountSheet = async (
  moment: Date
): Promise<Awaited<ReturnType<typeof mountSuspended>>> => {
  const reading = readSun(moment, DAM.lat, DAM.lon);
  return mountSuspended(SunSheet, {
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

const summaryAt = async (moment: Date): Promise<string> =>
  (await mountSheet(moment)).get('.sheet__summary span:last-child').text();

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

describe('SunSheet place search', () => {
  it('renders the search above the coordinate inputs and forwards its pick', async () => {
    const wrapper = await mountSheet(new Date(2026, 5, 21, 13, 42));
    const more = wrapper.get('.sheet__more');
    const search = more.get('input[role="combobox"]');
    const lat = more.get('input[name="lat"]');
    expect(
      search.element.compareDocumentPosition(lat.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    wrapper
      .getComponent({ name: 'PlaceSearch' })
      .vm.$emit('update', { lat: 1, lon: 2 });
    expect(wrapper.emitted('place')).toEqual([[{ lat: 1, lon: 2 }]]);
  });
});
