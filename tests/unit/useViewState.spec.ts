import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useViewState } from '~/composables/useViewState';

const DEBOUNCE_MS = 300;

describe('useViewState', () => {
  let router: ReturnType<typeof useRouter>;
  let replace: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    router = useRouter();
    vi.useFakeTimers();
    await router.push({
      path: '/',
      query: { lat: '51.9', lon: '4.4', date: '2026-06-21', time: '13:37' },
    });
    replace = vi.spyOn(router, 'replace').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    replace.mockRestore();
  });

  it('reads the route query once into local state', () => {
    const { state } = useViewState();
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
    const { state } = useViewState();
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

  it('does not let later route.query changes overwrite local state', async () => {
    const { state } = useViewState();
    state.time = '09:00';
    await router.push({
      path: '/',
      query: { lat: '10', lon: '20', date: '2025-01-01', time: '01:00' },
    });
    await nextTick();
    expect(state).toEqual({
      lat: 51.9,
      lon: 4.4,
      date: '2026-06-21',
      time: '09:00',
    });
  });

  it('falls back safely when the query is invalid', async () => {
    await router.push({ path: '/', query: { lat: '999', time: '25:00' } });
    const { state } = useViewState();
    expect(state.lat).toBe(52.3731);
    expect(state.time).toMatch(/^\d{2}:\d{2}$/);
  });
});
