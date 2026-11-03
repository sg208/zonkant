import type { ViewState } from '~/types/sun';
import { parseViewState, toQuery } from '~/utils/urlState';

// WHY: Safari throttles history.replaceState, so a slider drag must not write on every step
const WRITE_DELAY_MS = 300;

// Local state is the source of truth for edits. route.query is parsed at setup and again on every
// route change (hydration, back/forward, shared links), except the echo of our own write.
export const useViewState = (): { state: ViewState } => {
  const route = useRoute();
  const router = useRouter();
  const state = reactive<ViewState>(parseViewState(route.query, new Date()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastWritten: string | undefined;

  watch(
    state,
    () => {
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

  return { state };
};
