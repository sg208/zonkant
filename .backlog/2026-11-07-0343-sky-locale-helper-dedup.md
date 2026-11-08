# Share the app-locale and Intl tag helpers across Sun and Sky components

- **Date**: 2026-11-07 03:43
- **Type**: chore
- **Effort**: medium
- **Status**: done
- **Source**: review finding (v0.1.4 deferred low: "SkyCanvas/SkyControls/INTL_TAGS duplication", `.enggflo/brain.md:37`)

## Goal

- Locale-to-Intl mapping lives in one exported helper, so Sun and Sky views format numbers and dates the same way with no duplicated constants.

## Context

- `components/SkyControls.vue:22` — local `INTL_TAGS` copy; `:26` picks the tag with `locale.value === 'nl' ? 'nl' : 'en'`.
- `components/SkyTimesTable.vue:24` — local `appLocale` computed with the same ternary; `:26` second `INTL_TAGS` copy; `:52` date formatter uses it.
- `components/SunPanel.vue:22` and `components/SunSheet.vue:33` — same ternary, not yet using `INTL_TAGS`.
- `utils/format.ts:42` — the canonical `INTL_TAGS`, not exported; `:50-68` use it internally.
- `types/locale.ts` — `AppLocale` type the helpers depend on.
- Tests that pin the formatting: `tests/unit/format.spec.ts` (existing `formatDecimal`/`formatTime` coverage) and `tests/components/SkyControls.spec.ts`.

## Proposed approach

1. Export `INTL_TAGS` and add `toAppLocale(locale: string): AppLocale` in `utils/format.ts` (or `utils/locale.ts` if `format.ts` grows past ~150 lines) · files: `utils/format.ts` · satisfies: D-1, D-2
2. Replace the three local `INTL_TAGS` and four ternaries with the helper · files: `components/SkyControls.vue`, `components/SkyTimesTable.vue`, `components/SunPanel.vue`, `components/SunSheet.vue` · satisfies: D-1, D-2
3. Add a unit test that `toAppLocale('nl-NL')` / `'en-GB'` / unknown map to `nl` / `en` · files: `tests/unit/format.spec.ts` · satisfies: D-3

- Cheaper option: only remove the local `INTL_TAGS` copies in the two Sky components and import the exported constant; leave the ternaries. | none

## Done when

| id  | check                                                   | expect                                |
| --- | ------------------------------------------------------- | ------------------------------------- |
| D-1 | `grep -rln "INTL_TAGS" components \| wc -l`             | `0`                                   |
| D-2 | `grep -rn "=== 'nl' ? 'nl' : 'en'" components \| wc -l` | `0`                                   |
| D-3 | `pnpm vitest run tests/unit/format.spec.ts`             | exit 0 · new helper test passes       |
| D-4 | `pnpm test && pnpm type-check && pnpm lint`             | exit 0                                |
| D-5 | `pnpm test:e2e -- sky`                                  | exit 0 · Sky view behaviour unchanged |

## Shipped

- `toAppLocale` and `intlTagFor` in `utils/format.ts`; `composables/useAppLocale.ts` returns `{ appLocale, intlTag }`. SunPanel, SunSheet, SkyControls and SkyTimesTable use it. Date-text parsing (`utils/dateText.ts`) and angle wrap (`utils/angles.ts`) were deduplicated in the same refactor.

## Open questions

- none

## Also spotted

- `.enggflo/brain.md:37` — the other v0.1.4 deferred lows (`/sky` scroll-padding, SkyTimesTable hydration heuristic, `adoptStart` comment vs URL write, `isRelative` unused, direct `/sky` Amsterdam default, `@nuxtjs/i18n` dependency scan) each need their own item.
