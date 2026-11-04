import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlaceInputs from '~/components/PlaceInputs.vue';

const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

afterEach(() => {
  if (original) Object.defineProperty(navigator, 'geolocation', original);
  else Reflect.deleteProperty(navigator, 'geolocation');
});

const mountInputs = (): ReturnType<typeof mountSuspended> =>
  mountSuspended(PlaceInputs, { props: { lat: 52.3731, lon: 4.8926 } });

describe('PlaceInputs', () => {
  it('shows labelled inputs with the current place', async () => {
    const wrapper = await mountInputs();
    const lat = wrapper.get('input[name="lat"]');
    expect((lat.element as HTMLInputElement).value).toBe('52.3731');
    expect(
      wrapper.get(`label[for="${lat.attributes('id')}"]`).text()
    ).toContain('Latitude');
    expect(wrapper.get('input[name="lon"]').attributes('id')).toBeTruthy();
  });

  it('emits a valid place', async () => {
    const wrapper = await mountInputs();
    await wrapper.get('input[name="lat"]').setValue('51.9244');
    expect(wrapper.emitted('update')?.at(-1)).toEqual([
      { lat: 51.9244, lon: 4.8926 },
    ]);
    expect(
      wrapper.get('input[name="lat"]').attributes('aria-invalid')
    ).toBeUndefined();
  });

  it.each([
    ['lat', '91', 'Latitude must be between -90 and 90'],
    ['lon', '-181', 'Longitude must be between -180 and 180'],
    ['lat', '', 'Enter a number'],
  ])(
    'rejects %s=%j with aria-invalid, a described message and no emit',
    async (name, value, message) => {
      const wrapper = await mountInputs();
      const input = wrapper.get(`input[name="${name}"]`);
      await input.setValue(value);
      expect(input.attributes('aria-invalid')).toBe('true');
      const errorId = input.attributes('aria-describedby') ?? '';
      expect(errorId).not.toBe('');
      expect(wrapper.get(`#${errorId}`).text()).toContain(message);
      expect(wrapper.emitted('update')).toBeUndefined();
    }
  );

  it('recovers once the value is valid again', async () => {
    const wrapper = await mountInputs();
    const input = wrapper.get('input[name="lat"]');
    await input.setValue('95');
    await input.setValue('10');
    expect(input.attributes('aria-invalid')).toBeUndefined();
    expect(wrapper.emitted('update')?.at(-1)).toEqual([
      { lat: 10, lon: 4.8926 },
    ]);
  });

  it('follows the place from the parent (map click)', async () => {
    const wrapper = await mountInputs();
    await wrapper.setProps({ lat: 40.5, lon: -3.25 });
    expect(
      (wrapper.get('input[name="lat"]').element as HTMLInputElement).value
    ).toBe('40.5');
    expect(
      (wrapper.get('input[name="lon"]').element as HTMLInputElement).value
    ).toBe('-3.25');
  });

  it('Locate me emits the device position and says it stays on the device', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({
            coords: { latitude: 51.9244, longitude: 4.4777 },
          } as GeolocationPosition)
        ),
      },
    });
    const wrapper = await mountInputs();
    expect(wrapper.text()).toContain(
      'Your location stays on this device and is never sent anywhere.'
    );
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('update')?.at(-1)).toEqual([
      { lat: 51.9244, lon: 4.4777 },
    ]);
    expect(wrapper.get('[role="status"]').text()).toContain('Location found');
  });

  it('explains a denied permission in a status message and stays usable', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(
          (_ok: PositionCallback, fail: PositionErrorCallback) =>
            fail({ code: 1 } as GeolocationPositionError)
        ),
      },
    });
    const wrapper = await mountInputs();
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toContain(
      'permission was denied'
    );
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(
      wrapper.get('input[name="lat"]').attributes('disabled')
    ).toBeUndefined();
  });
});
