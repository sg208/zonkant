import type { ViewState } from '~/types/sun';
import { parseViewState, toQuery } from '~/utils/urlState';

// WHY: Safari throttles history.replaceState, so a slider drag must not write on every step
const WRITE_DELAY_MS = 300;

// Local state is the source of truth. route.query is read once here and only ever written to.
export const useViewState = (): { state: ViewState } => {
  const route = useRoute();
  const router = useRouter();
  const state = reactive<ViewState>(parseViewState(route.query, new Date()));
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(
    state,
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void router.replace({ query: toQuery(state) });
      }, WRITE_DELAY_MS);
    },
    { deep: true, flush: 'sync' }
  );

  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer));

  return { state };
};
