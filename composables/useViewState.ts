import type { LatLon, ViewState } from '~/types/sun';
import { DEFAULT_PLACE, parseViewState, toQuery } from '~/utils/urlState';

// WHY: Safari throttles history.replaceState, so a slider drag must not write on every step
const WRITE_DELAY_MS = 300;

// Local state is the source of truth for edits. route.query is parsed at setup and again on every
// route change (hydration, back/forward, shared links), except the echo of our own write.
export const useViewState = (): {
  state: ViewState;
  adoptStart: (place: LatLon) => boolean;
} => {
  const route = useRoute();
  const router = useRouter();
  const state = reactive<ViewState>(parseViewState(route.query, new Date()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWritten: string | undefined;
  let isSilent = false;

  watch(
    state,
    () => {
      if (isSilent) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const query = toQuery(state);
        lastWritten = JSON.stringify(query);
        void router.replace({ query });
      }, WRITE_DELAY_MS);
    },
    { deep: true, flush: 'sync' }
  );

  watch(
    () => route.fullPath,
    () => {
      const parsed = parseViewState(route.query, new Date());
      if (JSON.stringify(toQuery(parsed)) === lastWritten) {
        lastWritten = undefined;
        return;
      }
      Object.assign(state, parsed);
    }
  );

  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer));

  // Moves the bare-URL default to a guessed place without a URL write, so the guess never
  // leaks into shared links. Refuses once the URL or the user has chosen a place.
  const adoptStart = (place: LatLon): boolean => {
    const search = new URLSearchParams(window.location.search);
    const hasCoordsInUrl =
      route.query.lat !== undefined ||
      route.query.lon !== undefined ||
      search.has('lat') ||
      search.has('lon');
    const isDefault =
      state.lat === DEFAULT_PLACE.lat && state.lon === DEFAULT_PLACE.lon;
    if (hasCoordsInUrl || !isDefault) return false;
    isSilent = true;
    try {
      state.lat = place.lat;
      state.lon = place.lon;
    } finally {
      isSilent = false;
    }
    return true;
  };

  return { state, adoptStart };
};
