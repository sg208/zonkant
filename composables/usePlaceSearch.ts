import type { Ref } from 'vue';
import type { GeocodePlace, SearchStatus } from '~/types/geocode';
import {
  buildSearchUrl,
  MIN_QUERY_LENGTH,
  parsePhoton,
  RESULT_LIMIT,
} from '~/utils/geocode';

const DEBOUNCE_MS = 350;

export const usePlaceSearch = (): {
  results: Ref<GeocodePlace[]>;
  status: Ref<SearchStatus>;
  search: (query: string) => void;
  clear: () => void;
} => {
  const results = ref<GeocodePlace[]>([]);
  const status = ref<SearchStatus>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = undefined;
  };

  const run = async (query: string): Promise<void> => {
    const current = new AbortController();
    controller = current;
    const lang = (navigator.language ?? 'en').slice(0, 2).toLowerCase();
    try {
      const response = await fetch(buildSearchUrl(query, lang, RESULT_LIMIT), {
        signal: current.signal,
      });
      if (!response.ok) throw new Error('Search request failed');
      const places = parsePhoton(await response.json());
      if (current.signal.aborted) return;
      results.value = places;
      status.value = places.length > 0 ? 'results' : 'empty';
    } catch (error) {
      if (current.signal.aborted) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      results.value = [];
      status.value = 'error';
    }
  };

  const search = (query: string): void => {
    cancel();
    const trimmed = query.trim();
    results.value = [];
    if (trimmed.length < MIN_QUERY_LENGTH) {
      status.value = 'idle';
      return;
    }
    status.value = 'loading';
    timer = setTimeout(() => {
      void run(trimmed);
    }, DEBOUNCE_MS);
  };

  const clear = (): void => {
    cancel();
    results.value = [];
    status.value = 'idle';
  };

  if (getCurrentInstance()) onBeforeUnmount(cancel);

  return { results, status, search, clear };
};
