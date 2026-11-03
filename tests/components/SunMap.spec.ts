import { flushPromises, type VueWrapper } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { MapBrowserEvent } from 'ol';
import { Zoom } from 'ol/control';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import type Overlay from 'ol/Overlay';
import type View from 'ol/View';
import { fromLonLat, toLonLat } from 'ol/proj';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SunMap from '~/components/SunMap.client.vue';
import type { MapBearings } from '~/types/sun';

interface MockMapOptions {
  target?: HTMLElement;
  layers: unknown[];
  view: View;
  overlays: Overlay[];
  controls: { getArray: () => unknown[] };
}

interface MockMap {
  options: MockMapOptions;
  handlers: Record<string, (event: unknown) => void>;
  setTarget: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

const { maps, applyMock } = vi.hoisted(() => ({
  maps: [] as MockMap[],
  applyMock: vi.fn(),
}));

// Only the map shell and the style loader are mocked; view, layers, overlay,
// controls and projections stay real OpenLayers.
vi.mock('ol/Map', () => ({
  default: class MockOlMap {
    options: MockMapOptions;
    handlers: Record<string, (event: unknown) => void> = {};
    setTarget = vi.fn();
    dispose = vi.fn();
    constructor(options: MockMapOptions) {
      this.options = options;
      maps.push(this as unknown as MockMap);
    }
    on(type: string, handler: (event: unknown) => void): void {
      this.handlers[type] = handler;
    }
    un = vi.fn();
    getSize(): [number, number] {
      return [300, 400];
    }
    getView(): View {
      return this.options.view;
    }
  },
}));
vi.mock('ol-mapbox-style', () => ({ apply: applyMock }));

const DAM = { lat: 52.3731, lon: 4.8926 };
const BEARINGS: MapBearings = {
  sunrise: 45,
  sunset: 315,
  sun: 180,
  shadow: 0,
};

const mountMap = async (
  props: { bottomInset?: number; bearings?: MapBearings } = {}
): Promise<VueWrapper> => {
  const wrapper = await mountSuspended(SunMap, {
    props: { point: DAM, bearings: BEARINGS, ...props },
  });
  // OL is imported lazily; wait for the style call that ends the mount sequence
  await vi.waitFor(() => expect(applyMock).toHaveBeenCalled(), {
    timeout: 5000,
  });
  await flushPromises();
  return wrapper;
};

const featureCount = (): number => {
  const layer = maps[0]!.options.layers[1] as VectorLayer<VectorSource>;
  return layer.getSource()!.getFeatures().length;
};

const setReducedMotion = (isReduced: boolean): void => {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: isReduced,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  );
};

describe('SunMap', () => {
  beforeEach(() => {
    maps.length = 0;
    applyMock.mockReset();
    applyMock.mockResolvedValue(undefined);
    setReducedMotion(false);
  });

  it('applies the OpenFreeMap Positron style once', async () => {
    await mountMap();
    expect(applyMock).toHaveBeenCalledTimes(1);
    expect(applyMock.mock.calls[0]![1]).toBe(
      'https://tiles.openfreemap.org/styles/positron'
    );
    expect(maps).toHaveLength(1);
  });

  it('loads label fonts from this origin, never a third-party CDN', async () => {
    await mountMap();
    const options = applyMock.mock.calls[0]![2] as { webfonts?: string };
    expect(options.webfonts).toMatch(/^\//);
    expect(options.webfonts).not.toContain('http');
  });

  it('disposes the map on unmount', async () => {
    const wrapper = await mountMap();
    wrapper.unmount();
    expect(maps[0]!.setTarget).toHaveBeenCalledWith(undefined);
    expect(maps[0]!.dispose).toHaveBeenCalledTimes(1);
  });

  it('emits select with lon/lat on singleclick', async () => {
    const wrapper = await mountMap();
    maps[0]!.handlers.singleclick!({
      coordinate: fromLonLat([5.1214, 52.0907]),
    } as MapBrowserEvent);
    const [payload] = wrapper.emitted('select')![0] as [
      { lat: number; lon: number },
    ];
    expect(payload.lon).toBeCloseTo(5.1214, 6);
    expect(payload.lat).toBeCloseTo(52.0907, 6);
  });

  it('draws one line per bearing, omits null ones and redraws on change', async () => {
    const wrapper = await mountMap();
    expect(featureCount()).toBe(4);

    await wrapper.setProps({
      bearings: { ...BEARINGS, sun: null, shadow: null },
    });
    expect(featureCount()).toBe(2);

    await wrapper.setProps({ bearings: BEARINGS });
    expect(featureCount()).toBe(4);
  });

  it('sizes lines from the current resolution on moveend', async () => {
    await mountMap();
    const view = maps[0]!.options.view;
    const layer = maps[0]!.options.layers[1] as VectorLayer<VectorSource>;
    const lengthOfFirstLine = (): number => {
      const geometry = layer.getSource()!.getFeatures()[0]!.getGeometry();
      const [start, end] = (
        geometry as unknown as {
          getCoordinates: () => number[][];
        }
      ).getCoordinates() as [number[], number[]];
      return Math.hypot(end![0]! - start![0]!, end![1]! - start![1]!);
    };
    const before = lengthOfFirstLine();
    view.setResolution(view.getResolution()! * 2);
    maps[0]!.handlers.moveend!({});
    expect(lengthOfFirstLine()).toBeCloseTo(before * 2, 3);
  });

  it('places a labelled marker overlay on the point', async () => {
    await mountMap();
    const marker = maps[0]!.options.overlays[0]!;
    expect(marker.getElement()!.getAttribute('aria-label')).toBe(
      'Selected point'
    );
    const [lon, lat] = toLonLat(marker.getPosition()!);
    expect(lon).toBeCloseTo(DAM.lon, 6);
    expect(lat).toBeCloseTo(DAM.lat, 6);
  });

  it('shows a status message when the style fails to load', async () => {
    applyMock.mockRejectedValue(new Error('offline'));
    const wrapper = await mountMap();
    expect(wrapper.find('[role="status"]').text()).toBe(
      'Map tiles could not load'
    );
  });

  it('keeps the status region empty while the style loads fine', async () => {
    const wrapper = await mountMap();
    expect(wrapper.find('[role="status"]').text()).toBe('');
  });

  it('exposes a labelled map region with a legend', async () => {
    const wrapper = await mountMap();
    const region = wrapper.find('[role="region"]');
    expect(region.attributes('aria-label')).toBe('Map');
    expect(wrapper.text()).toContain('Sunrise');
    expect(wrapper.text()).toContain('Shadow');
  });

  it('credits OpenFreeMap, OpenMapTiles and OpenStreetMap with safe links', async () => {
    const wrapper = await mountMap();
    const links = wrapper.findAll('a');
    expect(links.map((link) => link.attributes('href'))).toEqual([
      'https://openfreemap.org',
      'https://www.openmaptiles.org/',
      'https://www.openstreetmap.org/copyright',
    ]);
    links.forEach((link) => {
      expect(link.attributes('rel')).toBe('noopener noreferrer');
      expect(link.attributes('target')).toBe('_blank');
    });
  });

  it('shifts the view padding by bottomInset and follows changes', async () => {
    const wrapper = await mountMap({ bottomInset: 240 });
    const view = maps[0]!.options.view;
    expect(view.padding).toEqual([0, 0, 240, 0]);
    await wrapper.setProps({ bottomInset: 120 });
    expect(view.padding).toEqual([0, 0, 120, 0]);
  });

  it('recentres on a point that changes from outside but not after a click', async () => {
    // WHY: reduced motion makes the recentre a synchronous jump we can read
    setReducedMotion(true);
    const wrapper = await mountMap();
    const view = maps[0]!.options.view;

    await wrapper.setProps({ point: { lat: 51.9244, lon: 4.4777 } });
    const [lon] = toLonLat(view.getCenter()!);
    expect(lon).toBeCloseTo(4.4777, 3);

    const clicked = { lat: 52.0907, lon: 5.1214 };
    maps[0]!.handlers.singleclick!({
      coordinate: fromLonLat([clicked.lon, clicked.lat]),
    } as MapBrowserEvent);
    await wrapper.setProps({ point: clicked });
    const [lonAfterClick] = toLonLat(view.getCenter()!);
    expect(lonAfterClick).toBeCloseTo(4.4777, 3);
  });

  describe('zoom controls', () => {
    // The control's own element is protected; attach it to a host div to read it
    const attachZoom = (): HTMLElement => {
      const view = maps[0]!.options.view;
      const zoom = maps[0]!.options.controls
        .getArray()
        .find((control) => control instanceof Zoom) as Zoom;
      const host = document.createElement('div');
      zoom.setTarget(host);
      zoom.setMap({
        getView: () => view,
        render: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as never);
      return host;
    };

    // OL animates zoom when the control duration is > 0 and jumps with
    // setZoom when it is 0.
    const clickZoomIn = (): { animatedMs?: number; isJump: boolean } => {
      const view = maps[0]!.options.view;
      const animate = vi.spyOn(view, 'animate');
      const setZoom = vi.spyOn(view, 'setZoom');
      attachZoom().querySelector<HTMLElement>('.ol-zoom-in')!.click();
      return {
        animatedMs: (animate.mock.calls[0]?.[0] as { duration?: number })
          ?.duration,
        isJump: setZoom.mock.calls.length > 0,
      };
    };

    it('animates zoom by default', async () => {
      await mountMap();
      const result = clickZoomIn();
      expect(result.animatedMs).toBeGreaterThan(0);
      expect(result.isJump).toBe(false);
    });

    it('uses duration 0 under reduced motion', async () => {
      setReducedMotion(true);
      await mountMap();
      const result = clickZoomIn();
      expect(result.animatedMs).toBeUndefined();
      expect(result.isJump).toBe(true);
    });

    it('names the zoom buttons for assistive tech', async () => {
      await mountMap();
      const host = attachZoom();
      expect(host.querySelector('.ol-zoom-in')!.textContent).toContain(
        'Zoom in'
      );
      expect(host.querySelector('.ol-zoom-out')!.textContent).toContain(
        'Zoom out'
      );
    });
  });
});
