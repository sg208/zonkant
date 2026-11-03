import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TimeControls from '~/components/TimeControls.vue';

const mountControls = (
  time = '13:37',
  date = '2026-06-21'
): ReturnType<typeof mountSuspended> =>
  mountSuspended(TimeControls, { props: { date, time } });

afterEach(() => {
  vi.useRealTimers();
});

describe('TimeControls', () => {
  it('shows the time on a labelled range slider with step 5 and spoken value text', async () => {
    const wrapper = await mountControls('13:37');
    const slider = wrapper.get('input[type="range"]');
    expect(slider.attributes('min')).toBe('0');
    expect(slider.attributes('max')).toBe('1439');
    expect(slider.attributes('step')).toBe('5');
    expect(slider.attributes('aria-valuetext')).toBe('13:37');
    expect(
      wrapper.get(`label[for="${slider.attributes('id')}"]`).text()
    ).toContain('Time');
  });

  it('emits update:time as HH:mm when the slider moves', async () => {
    const wrapper = await mountControls('13:37');
    await wrapper.get('input[type="range"]').setValue('485');
    expect(wrapper.emitted('update:time')?.at(-1)).toEqual(['08:05']);
  });

  it('emits update:date when a date is picked and ignores a cleared date', async () => {
    const wrapper = await mountControls();
    const input = wrapper.get('input[type="date"]');
    await input.setValue('2026-12-21');
    expect(wrapper.emitted('update:date')?.at(-1)).toEqual(['2026-12-21']);
    await input.setValue('');
    expect(wrapper.emitted('update:date')).toHaveLength(1);
  });

  it('Now sets today and the current local time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 25, 3, 7));
    const wrapper = await mountControls();
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update:date')?.at(-1)).toEqual(['2026-10-25']);
    expect(wrapper.emitted('update:time')?.at(-1)).toEqual(['03:07']);
    expect(wrapper.get('button').text()).toBe('Now');
  });
});
