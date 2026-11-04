# Let useViewState own query re-parsing instead of pages/index.vue

- **Date**: 2026-11-03 07:09
- **Type**: chore
- **Effort**: easy
- **Status**: done
- **Source**: request

## Goal

- One place reads `route.query` into view state: `useViewState`. Remove the second re-parse from `pages/index.vue`, so a shared or back/forward URL still updates the sun panel without a page-level watch.

## Context

- `pages/index.vue:16-20` — one-shot `watch(() => route.fullPath, …)` calls `parseViewState(route.query, new Date())` and assigns into `state`.
- `composables/useViewState.ts:11` — `state` is initialised from `route.query` once; `:14-19` writes state back with `router.replace`. The file header (`:7`) says `route.query` is "read once here and only ever written to", which the page watch contradicts.
- `tests/unit/useViewState.spec.ts` and `tests/components/IndexPage.spec.ts` cover the two paths separately; no test covers a route change while mounted.

## Proposed approach

1. Move the `route.fullPath` watch into `useViewState` and re-parse there · files: `composables/useViewState.ts` · satisfies: D-2
2. Delete the watch and `stopAdopting` from `pages/index.vue` · files: `pages/index.vue` · satisfies: D-1
3. Add a unit case: mounted state updates when `route.fullPath` changes · files: `tests/unit/useViewState.spec.ts` · satisfies: D-3

- Cheaper option: keep the page watch and only fix the header comment at `useViewState.ts:7` | none

## Done when

| id  | check                                                              | expect                  |
| --- | ------------------------------------------------------------------ | ----------------------- |
| D-1 | `grep -c "route.fullPath" pages/index.vue`                         | 0                       |
| D-2 | `grep -c "parseViewState(route.query" composables/useViewState.ts` | 2 (init + route watch)  |
| D-3 | `pnpm vitest run tests/unit/useViewState.spec.ts`                  | exit 0, new case passes |
| D-4 | `pnpm test:e2e -- url-state`                                       | exit 0                  |

## Also spotted

- `utils/format.ts:54` — times use the device zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); `components/SunPanel.vue:91` labels them as the device's zone. Showing the location's zone is a separate item.
