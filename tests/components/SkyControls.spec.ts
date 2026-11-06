import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { DOMWrapper, VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SkyControls from '~/components/SkyControls.vue';

const PROPS = {
  isCalibrated: false,
  canCalibrate: true,
  calibrateNote: null,
  headingOffsetDeg: 0,
  fovDeg: 63,
};

const buttonNamed = (
  wrapper: VueWrapper,
  name: RegExp
): DOMWrapper<Element> | undefined =>
  wrapper.findAll('button').find((button) => name.test(button.text()));

describe('SkyControls', () => {
  it('warns about the compass until calibrated, then says so', async () => {
    const uncalibrated = await mountSuspended(SkyControls, { props: PROPS });
    expect(uncalibrated.text()).toContain(
      'Compass may be off by 10° or more. Point at the sun and tap Calibrate.'
    );
    const calibrated = await mountSuspended(SkyControls, {
      props: { ...PROPS, isCalibrated: true },
    });
    expect(calibrated.text()).not.toContain('off by 10° or more');
    expect(calibrated.text()).toContain('Calibrated on the sun');
  });

  it('disables Calibrate with a visible reason wired to the button', async () => {
    const wrapper = await mountSuspended(SkyControls, {
      props: {
        ...PROPS,
        canCalibrate: false,
        calibrateNote:
          'The sun is below the horizon, so there is nothing to point at.',
      },
    });
    const button = buttonNamed(wrapper, /^Calibrate$/);
    expect(button?.attributes('disabled')).toBeDefined();
    const noteId = button?.attributes('aria-describedby') ?? '';
    expect(noteId).not.toBe('');
    expect(wrapper.find(`#${noteId}`).text()).toContain('below the horizon');
    // Paired case: enabled and no stray description
    const ready = await mountSuspended(SkyControls, { props: PROPS });
    const enabled = buttonNamed(ready, /^Calibrate$/);
    expect(enabled?.attributes('disabled')).toBeUndefined();
    expect(enabled?.attributes('aria-describedby')).toBeUndefined();
  });

  it('emits calibrate, nudge in both directions and reset', async () => {
    const wrapper = await mountSuspended(SkyControls, { props: PROPS });
    await buttonNamed(wrapper, /^Calibrate$/)?.trigger('click');
    await buttonNamed(wrapper, /\+1°/)?.trigger('click');
    await buttonNamed(wrapper, /-1°/)?.trigger('click');
    await buttonNamed(wrapper, /^Reset calibration$/)?.trigger('click');
    expect(wrapper.emitted('calibrate')).toHaveLength(1);
    expect(wrapper.emitted('nudge')).toEqual([[1], [-1]]);
    expect(wrapper.emitted('reset')).toHaveLength(1);
  });

  it('shows the heading correction and a labelled 40-90 field of view slider', async () => {
    const wrapper = await mountSuspended(SkyControls, {
      props: { ...PROPS, headingOffsetDeg: -2.5 },
    });
    expect(wrapper.text()).toContain('Heading correction: -2.5°');
    const slider = wrapper.get('input[type="range"]');
    expect(slider.attributes('min')).toBe('40');
    expect(slider.attributes('max')).toBe('90');
    expect((slider.element as HTMLInputElement).value).toBe('63');
    const label = wrapper.get(`label[for="${slider.attributes('id')}"]`);
    expect(label.text()).toBe('Field of view');
  });

  it('has Dutch names and warning', async () => {
    const wrapper = await mountSuspended(SkyControls, {
      props: { ...PROPS, headingOffsetDeg: 1.5 },
      route: '/nl',
    });
    expect(wrapper.text()).toContain(
      'Het kompas kan 10° of meer afwijken. Richt op de zon en tik op Kalibreren.'
    );
    expect(buttonNamed(wrapper, /^Kalibreren$/)).toBeDefined();
    expect(buttonNamed(wrapper, /^Richting \+1°$/)).toBeDefined();
    expect(buttonNamed(wrapper, /^Kalibratie herstellen$/)).toBeDefined();
    expect(wrapper.text()).toContain('Richtingscorrectie: +1,5°');
    expect(wrapper.get('label').text()).toBe('Gezichtsveld');
    expect(wrapper.attributes('aria-label')).toBe('Kalibratie en weergave');
    expect(wrapper.text()).not.toContain('Calibrate');
  });
});
