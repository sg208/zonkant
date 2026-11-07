# Add e2e text checks for camera and Sky view wording on legal pages

- **Date**: 2026-11-07 00:40
- **Type**: task
- **Effort**: easy
- **Status**: ready
- **Source**: request

## Goal

- The built `/privacy`, `/en/privacy`, `/accessibility` and `/en/accessibility` pages are checked end to end for the camera and Sky view wording, in both locales.

## Context

- `pages/privacy.vue:30-32` — Sky section renders `privacy.sky.camera` and `privacy.sky.sensors`; copy shipped in `fce2a08`.
- `pages/accessibility.vue:35-38` — Sky section renders `accessibility.sky.beta` and `accessibility.sky.alternative`.
- `i18n/locales/{en,nl}/legal.json:36-37` (privacy camera, sensors) and `:97-98` (accessibility beta, alternative) — source strings for every phrase below.
- `tests/components/legal.spec.ts:157-184` — already asserts these phrases in both locales, but via `mountSuspended`, not the built `.output/public` pages. That is the gap.
- `tests/e2e/legal.e2e.ts:25-62` — Dutch and English privacy promise tests use `page.locator('main').innerText()`; none asserts camera or Sky wording.
- `tests/unit/i18nKeys.spec.ts:78-79` — `nl` is the default locale with `prefix_except_default`: `/privacy` renders Dutch, `/en/privacy` English. `tests/e2e/legal.e2e.ts:27` sets `locale: 'nl-NL'` for Dutch tests.
- `playwright.config.ts:14` — default browser locale `en-US`; `:20` serves `.output/public` on port 4312.

## Proposed approach

1. Add a `sky wording` describe to `tests/e2e/legal.e2e.ts`: `/en/privacy` and `/en/accessibility` in the default context, `/privacy` and `/accessibility` under `test.use({ locale: 'nl-NL' })`; each test reads `page.locator('main').textContent()` and asserts its phrases · files: `tests/e2e/legal.e2e.ts` · satisfies: D-1, D-4, D-5
   - EN privacy: `Camera frames stay on your device` · `they are not recorded, uploaded or stored` · `The camera starts only after you tap` · `orientation sensors`
   - EN accessibility: `Sky view (Beta)` · `Sky view is in Beta` · `a table on that page`
   - NL privacy: `Camerabeelden blijven op je apparaat` · `niet opgenomen, geüpload of opgeslagen` · `De camera start pas nadat je op` · `bewegingssensoren`
   - NL accessibility: `Hemelzicht (bèta)` · `Hemelzicht is een bètaversie` · `een tabel op die pagina`
2. Run the mutation checks in a scratch worktree, one phrase removed per locale, to prove the tests fail · files: none (scratch worktree) · satisfies: D-2, D-3

- Cheaper option: none — `legal.spec.ts` already covers the phrases; the e2e adds only the built-output check.

## Done when

| id  | check                                                                                                                                                             | expect                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| D-1 | `pnpm test:e2e -- legal`                                                                                                                                          | exit 0 · the 4 `sky wording` tests pass on chromium and mobile |
| D-2 | in a scratch worktree (not the working tree), delete `they are not recorded, uploaded or stored` from `i18n/locales/en/legal.json`, then `pnpm test:e2e -- legal` | exit non-zero · the `/en/privacy` sky wording test fails       |
| D-3 | in a scratch worktree, delete `niet opgenomen, geüpload of opgeslagen` from `i18n/locales/nl/legal.json`, then `pnpm test:e2e -- legal`                           | exit non-zero · the `/privacy` sky wording test fails          |
| D-4 | `pnpm exec playwright test tests/e2e/legal.e2e.ts --project=chromium --list \| grep -c "sky wording"`                                                             | `4` (one title per URL)                                        |
| D-5 | `pnpm lint && pnpm format:check`                                                                                                                                  | exit 0                                                         |

## Open questions

- none

## Also spotted

- none
