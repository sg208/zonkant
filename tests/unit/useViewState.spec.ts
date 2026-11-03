import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewState } from '~/composables/useViewState';

const DEBOUNCE_MS = 300;

describe('useViewState', () => {
  let router: ReturnType<typeof useRouter>;
  let replace: ReturnType<typeof vi.spyOn>;
  let realReplace: typeof router.replace;
  let scope: ReturnType<typeof effectScope>;
  const mount = (): ReturnType<typeof useViewState> =>
    scope.run(() => useViewState())!;

  // WHY: router.push never settles under fake timers here, so navigate on real ones
  const navigate = async (
    to: Parameters<typeof router.push>[0]
  ): Promise<void> => {
    vi.useRealTimers();
    await router.push(to);
    vi.useFakeTimers();
  };

  beforeEach(async () => {
    router = useRouter();
    scope = effectScope();
    await router.push({
      path: '/',
      query: { lat: '51.9', lon: '4.4', date: '2026-06-21', time: '13:37' },
    });
    realReplace = router.replace.bind(router);
    replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    scope.stop();
    vi.useRealTimers();
    replace.mockRestore();
  });

  it('reads the route query at setup', () => {
    const { state } = mount();
    expect(state).toEqual({
      lat: 51.9,
      lon: 4.4,
      date: '2026-06-21',
      time: '13:37',
    });
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);
    expect(replace).not.toHaveBeenCalled();
  });

  it('turns a burst of changes into one trailing router.replace with the last value', () => {
    const { state } = mount();
    for (const time of ['08:00', '08:05', '08:10', '08:15']) {
      state.time = time;
      vi.advanceTimersByTime(DEBOUNCE_MS - 50);
    }
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith({
      query: { lat: '51.9', lon: '4.4', date: '2026-06-21', time: '08:15' },
    });
  });

  it('adopts a route change while mounted', async () => {
    const { state } = mount();
    await navigate({
      path: '/',
      query: { lat: '10', lon: '20', date: '2025-01-01', time: '01:00' },
    });
    await nextTick();
    expect(state).toEqual({
      lat: 10,
      lon: 20,
      date: '2025-01-01',
      time: '01:00',
    });
  });

  it('does not re-write after adopting its own echo', async () => {
    replace.mockImplementation(realReplace);
    const { state } = mount();
    state.time = '09:00';
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(replace).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.time).toBe('09:00')
    );
    await nextTick();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(state.time).toBe('09:00');
  });

  it('keeps a newer local edit over a stale echo', async () => {
    const { state } = mount();
    state.time = '09:00';
    vi.advanceTimersByTime(DEBOUNCE_MS);
    expect(replace).toHaveBeenCalledTimes(1);
    state.time = '10:00';
    await navigate({
      path: '/',
      query: { lat: '51.9', lon: '4.4', date: '2026-06-21', time: '09:00' },
    });
    await nextTick();
    expect(state.time).toBe('10:00');
  });

  it('falls back safely when the query is invalid', async () => {
    await navigate({ path: '/', query: { lat: '999', time: '25:00' } });
    const { state } = mount();
    expect(state.lat).toBe(52.3731);
    expect(state.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
