import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaceSearch } from '~/composables/usePlaceSearch';

const BODY = {
  features: [
    {
      geometry: { coordinates: [4.9, 52.37] },
      properties: { name: 'Amsterdam', country: 'Netherlands' },
    },
  ],
};

const okResponse = (body: unknown = BODY): Response =>
  new Response(JSON.stringify(body), { status: 200 });

const fetchMock = vi.fn();
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(350);
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => okResponse());
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('usePlaceSearch', () => {
  it('does not fetch below 3 trimmed characters', async () => {
    const { search, status } = usePlaceSearch();
    search('  ab ');
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(status.value).toBe('idle');
  });

  it('fetches once after the debounce, for a burst', async () => {
    const { search, status, results } = usePlaceSearch();
    search('ams');
    search('amst');
    search('amste');
    expect(status.value).toBe('loading');
    await vi.advanceTimersByTimeAsync(349);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://photon.komoot.io/api/?q=amste&limit=6&lang=en'
    );
    expect(status.value).toBe('results');
    expect(results.value.map((place) => place.label)).toEqual([
      'Amsterdam, Netherlands',
    ]);
  });

  it('sends nothing but the URL (no headers, no bias)', async () => {
    const { search } = usePlaceSearch();
    search('amst');
    await flush();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(Object.keys(init).sort()).toEqual(['signal']);
  });

  it('aborts the previous request and ignores its late answer', async () => {
    const signals: AbortSignal[] = [];
    const resolvers: Array<(response: Response) => void> = [];
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve) => {
          signals.push(init.signal as AbortSignal);
          resolvers.push(resolve);
        })
    );
    const { search, results, status } = usePlaceSearch();
    search('first');
    await flush();
    search('second');
    await flush();
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    resolvers[0]?.(okResponse());
    await vi.advanceTimersByTimeAsync(0);
    expect(results.value).toEqual([]);
    expect(status.value).toBe('loading');
    resolvers[1]?.(okResponse());
    await vi.advanceTimersByTimeAsync(0);
    expect(status.value).toBe('results');
  });

  it('reports empty', async () => {
    fetchMock.mockImplementation(async () => okResponse({ features: [] }));
    const { search, status } = usePlaceSearch();
    search('zzzz');
    await flush();
    expect(status.value).toBe('empty');
  });

  it.each([
    [
      'non-OK',
      async (): Promise<Response> => new Response('x', { status: 500 }),
    ],
    [
      'network error',
      async (): Promise<Response> => {
        throw new TypeError('Failed to fetch');
      },
    ],
    [
      'malformed JSON',
      async (): Promise<Response> => new Response('<html>', { status: 200 }),
    ],
  ])(
    'reports error on %s without throwing or logging',
    async (_name, impl): Promise<void> => {
      fetchMock.mockImplementation(impl);
      const spies = (['log', 'error', 'warn'] as const).map((method) =>
        vi.spyOn(console, method)
      );
      const { search, status, results } = usePlaceSearch();
      search('amst');
      await flush();
      expect(status.value).toBe('error');
      expect(results.value).toEqual([]);
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    }
  );

  it('stays silent on AbortError', async () => {
    fetchMock.mockImplementation(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    const { search, status } = usePlaceSearch();
    search('amst');
    await flush();
    expect(status.value).toBe('loading');
  });

  it('clear aborts the request and resets', async () => {
    let signal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>(() => {
          signal = init.signal as AbortSignal;
        })
    );
    const { search, clear, status, results } = usePlaceSearch();
    search('amst');
    await flush();
    clear();
    expect(signal?.aborted).toBe(true);
    expect(status.value).toBe('idle');
    expect(results.value).toEqual([]);
  });

  it('clear cancels a pending debounce', async () => {
    const { search, clear } = usePlaceSearch();
    search('amst');
    clear();
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses a supported navigator language', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-CA');
    const { search } = usePlaceSearch();
    search('amst');
    await flush();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('lang=fr');
  });
});
