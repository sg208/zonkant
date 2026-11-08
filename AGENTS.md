# AGENTS.md

- PROJECT: zonkant — sun and shadow planner, Nuxt 4 static site + OpenLayers + suncalc (`README.md:3`)
- STATUS: v0.1.4 released (tag `v0.1.4`, `main`); last recorded deploy v0.1.2 to https://zonkant.engg.app on 2026-11-04 (`DEPLOYMENT.md:3`) <!-- enggflo -->
- LEARNINGS: `.enggflo/learning.md` · DECISIONS: `.enggflo/brain.md` · DESIGN: `design.md`
- GITIGNORE: `.enggflo/` is ignored (`.gitignore:72`) — see Gotchas

## Commands

Verified 2026-11-03 with pnpm 10 and Node 24. `unverified` = not run in bootstrap.

```bash
pnpm install --frozen-lockfile   # unverified: postinstall runs `nuxt prepare`; eslint needs `.nuxt/`
pnpm dev                         # unverified: Nuxt dev server
pnpm test                        # verified 2026-11-08: vitest run, 45 files, 465 tests pass
pnpm test:e2e                    # verified 2026-11-08: build, then Playwright on :4312 (137 pass, 1 skipped); needs `pnpm exec playwright install chromium`
pnpm lint                        # verified: eslint . — clean
pnpm type-check                  # verified: vue-tsc --noEmit — exit 0
pnpm format:check                # verified: prettier --check — clean
pnpm build                       # verified 2026-11-08: nuxt generate -> .output/public, 26 routes (nl + en trees), no network; FAILS on any unallowlisted `WARN` (`scripts/generate-checked.mjs`)
pnpm preview                     # unverified: serve the built output
pnpm run deploy                  # verified 2026-11-03 (wrangler deploy step, run from a clean main worktree with sg208 workers token): side effect; main only
```

## Task routing

| Task                   | Route                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| feature build          | `/enggflo-ship` (commits + pushes current branch, no PR)                                                 |
| bug                    | `/enggflo-bugfix`                                                                                        |
| UI / visual            | `taste-skill:design-taste-frontend` + `.taste-skill/direction.json` (`direction.id` = `flat-instrument`) |
| dependency review      | `/enggflo-maintenance` → `.backlog/` items                                                               |
| backlog item           | `/enggflo-backlog`                                                                                       |
| promote develop → main | `/enggflo-release` (first release creates `main`)                                                        |

## Architecture

| Concept                 | Path / state                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stack                   | Nuxt 4.6 · plain CSS tokens · OpenLayers 10.11 + ol-mapbox-style 13.9 · suncalc 2.1.1 · @nuxtjs/i18n 10.6 (nl default, en under `/en`) · TikTok Sans self-hosted (`nuxt.config.ts:22`) · pnpm 10 · Node 24 (`.node-version`)                                                                                                  |
| pages                   | `pages/index.vue` (map + sun sheet) · `pages/sky.vue` (Sky view beta) · `pages/{privacy,terms,accessibility,credits}.vue` · `error.vue`                                                                                                                                                                                       |
| layouts                 | `layouts/app.vue` (full-screen map shell; `pages/index.vue:7`) · `layouts/default.vue` (header + footer; legal pages)                                                                                                                                                                                                         |
| map                     | `components/SunMap.client.vue` (OL map, OpenFreeMap style, sun-line layers) · rendered inside `<ClientOnly>` (`pages/index.vue:51`)                                                                                                                                                                                           |
| sheet + panels          | `components/SunSheet.vue` (bottom sheet; side panel ≥768px) · `SunPanel.vue` · `TimeControls.vue` (range slider) · `PlaceSearch.vue` (Photon combobox) · `PlaceInputs.vue` (lat/lon + "Locate me")                                                                                                                            |
| header / footer / legal | `components/AppHeader.vue` · `components/AppFooter.vue` · `components/LegalPage.vue`                                                                                                                                                                                                                                          |
| sun maths               | `utils/sun.ts` (suncalc adapter: `readSun`, `getDayTimes`, `shadowLength`) · `utils/sunLines.ts` (bearing lines) · types `types/sun.ts`                                                                                                                                                                                       |
| URL state               | `utils/urlState.ts` (`parseViewState`, `toQuery`, `viewStateToDate`) · `composables/useViewState.ts` (write debounce 300 ms)                                                                                                                                                                                                  |
| place search            | `utils/geocode.ts` (`buildSearchUrl`, `parsePhoton`) · `composables/usePlaceSearch.ts` (350 ms debounce, min 3 chars, abort stale) · `components/PlaceSearch.vue` · types `types/geocode.ts`                                                                                                                                  |
| geolocation             | `composables/useGeolocation.ts` (never stored)                                                                                                                                                                                                                                                                                |
| zone start              | `utils/zoneStart.ts` (`zonePlace`, lazy chunk) · `utils/zoneCoords.ts` (generated: `node scripts/gen-zone-coords.mjs <zone.tab> <tzdata.zi> utils/zoneCoords.ts` + prettier) · `useViewState` `adoptStart` (no URL write) · `pages/index.vue` `onMounted` announces via `.page__start-note` status <!-- enggflo -->           |
| formatting              | `utils/format.ts` (`toAppLocale`, `intlTagFor`) · `utils/dateText.ts` (`YYYY-MM-DD` / `HH:MM` text ↔ local `Date`) · `utils/angles.ts` (`wrapDegrees`) · `composables/useAppLocale.ts` (`appLocale`, `intlTag`) · `composables/usePageHead.ts` (title `<t> - Zonkant` + description, all 5 content pages) <!-- enggflo -->    |
| tokens                  | `assets/css/main.css` · colours mirrored in `utils/palette.ts` (checked by `tests/unit/palette.spec.ts`)                                                                                                                                                                                                                      |
| edge headers            | `public/_headers` (CSP Report-Only; Permissions-Policy `camera=(self)` + sensors for Sky view) · `wrangler.jsonc` (Worker static assets `.output/public`)                                                                                                                                                                     |
| i18n                    | `nuxt.config.ts` `i18n` (`prefix_except_default`, `detectBrowserLanguage: false`) · loaders `i18n/locales/{nl,en}.ts` → `{nl,en}/{app,legal,sky}.json` · `utils/langRedirect.ts` (inline head script, nl routes) · `components/LanguageSwitcher.vue` · see `design.md` § i18n routing <!-- enggflo -->                        |
| sky view                | `pages/sky.vue` · `components/SkyCanvas.client.vue` (in `<ClientOnly>`) · `SkyControls.vue` · `SkyTimesTable.vue` · `utils/{skyPath,skyProjection,skyCalibration,deviceOrientation,skyAccess,skyDraw}.ts` · `composables/{useCameraStream,useDeviceOrientation,useSkyCalibration}.ts` · types `types/sky.ts` <!-- enggflo --> |
| data flow               | `pages/index.vue` state → `readSun` / `getDayTimes` → SunSheet + SunPanel readouts and SunMap bearings; URL ↔ `useViewState`                                                                                                                                                                                                  |
| data source             | tiles: `https://tiles.openfreemap.org` (`components/SunMap.client.vue:29`) · geocoding: `https://photon.komoot.io/api/` (`utils/geocode.ts`), browser fetch, only typed text sent                                                                                                                                             |
| conventions             | explicit return types (`eslint.config.mjs:6`) · `script-setup` only (`:24`) · TS blocks (`:25`) · Prettier single quotes (`.prettierrc.json`)                                                                                                                                                                                 |
| CI/CD                   | none — `.github/` absent; deploy is manual (`DEPLOYMENT.md:5`)                                                                                                                                                                                                                                                                |
| branches                | `develop` + `main` (created 2026-11-03)                                                                                                                                                                                                                                                                                       |

## Test profile

| field       | value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| runner      | Vitest 5.1 + `@nuxt/test-utils`, `environment: 'nuxt'`, happy-dom, `TZ` Europe/Amsterdam (`vitest.config.ts:5,9`) · Playwright 1.64 (`playwright.config.ts`)              |
| command     | `pnpm test` (unit + component, 465 pass) · `pnpm test:e2e` (build + Playwright; 138 tests: 137 pass, 1 skipped — the mobile-only layout test on chromium; run 2026-11-08) |
| conventions | `tests/unit/*.spec.ts` · `tests/components/*.spec.ts` · `tests/e2e/*.e2e.ts` (`playwright.config.ts:7`) · `tests/setup.ts` mocks matchMedia and IntersectionObserver      |
| levels      | unit ✓ (incl. component) · integration ✗ · e2e ✓                                                                                                                          |
| enforced_by | unverified — no CI; `.github/` absent                                                                                                                                     |

## Project

- WHAT: sun and shadow planner; tap a map point or search a place (Photon) to read sun height, direction, key times and a 1 m shadow (`README.md:3`)
- WHO: people choosing a sunny balcony, terrace, garden or home, and photographers planning light; Amsterdam default (user brief, 2026-11-03)
- STATUS: v0.1.4 (map, sun sheet, URL state, geolocation, place search, time-zone start, legal pages, headers, tests); deployed as Worker `zonkant` on sg208; remote `origin` = github.com/sg208/zonkant
- BRANCHES: `develop` (work) · `main` (releases, tags `v0.1.1`–`v0.1.4`) · work branches `<type>/<slug>` off `develop` (global rule)
- COMMITS: no enforced convention; imperative subject observed (`git log`)
- LICENCE: MIT (`package.json` `license`, `LICENSE`)

## Gotchas

- `.gitignore:72` ignores `.enggflo/` — enggflo files here are untracked; `commit.mjs` will not stage ignored paths (same as pokedex: `git check-ignore -v .enggflo/brain.md`)
- `composables/useViewState.ts:7` — the composable owns the query re-parse: setup plus a continuous `route.fullPath` watch, skipping the echo of its own `router.replace` (`lastWritten`); `pages/index.vue` does not parse the query
- `components/SunMap.client.vue:218-222` — `webfonts` must stay passed; the bundle still holds the unused jsDelivr template (`grep -l cdn.jsdelivr .output/public/_nuxt/*.js` after `pnpm build`)
- `components/SunMap.client.vue:2` — `import 'ol/ol.css'` must stay; without it zoom controls render `position: static`
- `pages/index.vue:51` — the map sits inside `<ClientOnly>`; a changing prop on the `.client` component crashed mobile hydration
- `public/_headers:7` — CSP is Report-Only; enforce only after `wrangler dev` on the built output (`DEPLOYMENT.md:37`)
- `app.config.ts:3` — `repoUrl` = github.com/sg208/zonkant (resolves, HTTP 200 on 2026-11-03)
- `wrangler.jsonc:8` — custom domain `zonkant.engg.app`; `workers_dev` and preview URLs off (`wrangler.jsonc:9-10`)
- `playwright.config.ts:19` — e2e serves `.output/public` on 4312; run `pnpm build` first (`test:e2e` does)
- `nuxt.config.ts` i18n — ONE loader file per locale (`i18n/locales/<code>.ts`); listing several JSON `files` logs "Cannot assign to read only property" and now fails the build (exit 1 via `scripts/check-build-warnings.mjs`; was exit 0) (`.enggflo/learning.md` `i18n-multi-file-readonly-merge`) <!-- enggflo -->
- `vitest.config.ts` overrides i18n `defaultLocale: 'en'` for tests; Dutch component tests mount with `route: '/nl'`. e2e uses `/en/…` (Playwright locale en-US) and `/…` for Dutch <!-- enggflo -->
- e2e on the map page MUST wait for `.ol-viewport` attached before typing; i18n preload slows hydration (`.enggflo/learning.md` `e2e-type-before-hydration`) <!-- enggflo -->
- `tests/unit/i18nKeys.spec.ts` — nl and en need identical keys and `{placeholders}`; top-level keys MUST NOT repeat across `app`/`legal`/`sky` (shallow merge in the loaders) <!-- enggflo -->
- `tests/e2e/sky.e2e.ts` — fake camera flags are file-level `test.use`; the sun marker is the only `rgb(255,212,0)` paint (pixel probe relies on it). Real-device compass accuracy is unverified (manual) <!-- enggflo -->
- `vitest.config.ts:5` and `playwright.config.ts:13` pin Europe/Amsterdam; sun-time assertions depend on it
- `utils/sun.ts:71` — day times use the device zone offset; `pages/index.vue:17-23` computes them at 12:00 so slider moves skip the scan
- `utils/zoneCoords.ts` is generated — NEVER hand-edit; tz links only fill ids absent from `zone.tab` (`.enggflo/learning.md` `tz-links-overwrite-zone-tab`). macOS source: `/var/db/timezone/tz/<ver>/zoneinfo/` <!-- enggflo -->
- `components/PlaceSearch.vue` — list + status popover are absolute overlays; the `role=status` region is visually hidden and the only announcer (popover `aria-hidden`), empty while the list is closed except "Moved to"; Enter with no option highlighted picks the first result; Escape on a closed list clears <!-- enggflo -->
- `tests/unit/noStorage.spec.ts:16` — source scan forbids `localStorage`, `sessionStorage`, cookies, IndexedDB and `console.log`
- `eslint.config.mjs:1` — imports `.nuxt/eslint.config.mjs`; lint needs `nuxt prepare` first
- New file under `composables/` → `pnpm exec nuxt prepare` before `pnpm type-check` (stale `.nuxt` types → TS2304); composables stay auto-imported, `~/utils/*` imported explicitly (`.enggflo/learning.md` `new-composable-needs-nuxt-prepare`) <!-- enggflo -->
- `tests/e2e/search.e2e.ts` — e2e MUST `page.route` Photon; each test asserts Photon requests seen = fulfilled by the mock (real service never hit)
- `public/_headers:7` — CSP `connect-src` lists `photon.komoot.io`; a new third-party host needs the CSP, `tests/unit/deployConfig.spec.ts`, privacy and credits pages updated together
- Hydration warning "contains mismatches" appears on base too when the visit is later than the build (prerendered "now"); compare base vs head under the same `page.clock` offset (`.enggflo/learning.md` `hydration-warning-build-time`)

## References

- nuxt — https://nuxt.com/llms.txt (llms.txt)
- vue — https://vuejs.org/llms.txt (llms.txt)
- vitest — https://vitest.dev/llms.txt (llms.txt)
- @fontsource-variable/tiktok-sans — https://fontsource.org/llms.txt (llms.txt)
- prettier — https://prettier.io/llms.txt (llms.txt)
- @nuxtjs/i18n — https://i18n.nuxtjs.org/llms.txt (llms.txt) <!-- enggflo -->
