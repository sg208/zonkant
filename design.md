# design.md

<!-- enggflo -->

PURPOSE: architecture, data flow, key decisions. Reader = acting agent. Decision history → `.enggflo/brain.md`.

## Architecture

| Layer     | Path                                                                                                                                                                           | Role                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| build     | `nuxt.config.ts:46-50`                                                                                                                                                         | `nuxt generate` prerenders 12 explicit routes (6 per locale, incl. `/sky`); `crawlLinks: false`      |
| deploy    | `wrangler.jsonc:4-8`                                                                                                                                                           | Worker static assets from `.output/public`; custom domain only                                       |
| headers   | `public/_headers:1-7`                                                                                                                                                          | HSTS, nosniff, frame deny, Permissions-Policy, CSP Report-Only                                       |
| page      | `pages/index.vue`                                                                                                                                                              | owns view state; derives sun reading + day times; renders map/sheet                                  |
| map       | `components/SunMap.client.vue:200`                                                                                                                                             | OL `Map`; base layers from OpenFreeMap style; sun-line `VectorLayer` (`:172`)                        |
| sheet     | `components/SunSheet.vue` · `SunPanel.vue` · `TimeControls.vue` · `PlaceSearch.vue` · `PlaceInputs.vue`                                                                        | readouts and inputs                                                                                  |
| sun maths | `utils/sun.ts:11` `readSun` · `:63` `getDayTimes` · `:120` `shadowLength` · `utils/sunLines.ts:14`                                                                             | suncalc adapter; pure functions                                                                      |
| URL state | `utils/urlState.ts:53` `parseViewState` · `:69` `toQuery` · `composables/useViewState.ts:9`                                                                                    | query ↔ state                                                                                        |
| location  | `composables/useGeolocation.ts:15`                                                                                                                                             | browser geolocation; never stored                                                                    |
| search    | `utils/geocode.ts` `buildSearchUrl` · `parsePhoton` · `composables/usePlaceSearch.ts` · `components/PlaceSearch.vue`                                                           | Photon geocoding; 350 ms debounce, min 3 chars, 6 results, stale requests aborted; WAI-ARIA combobox |
| i18n      | `nuxt.config.ts` `i18n` · `i18n/locales/{nl,en}.ts` (loader) + `{nl,en}/{app,legal,sky}.json` · `utils/langRedirect.ts` · `components/LanguageSwitcher.vue`                    | `@nuxtjs/i18n`; Dutch at `/`, English at `/en`; keys checked by `tests/unit/i18nKeys.spec.ts`        |
| sky view  | `pages/sky.vue` · `components/SkyCanvas.client.vue` · `SkyControls.vue` · `SkyTimesTable.vue` · `utils/sky*.ts` · `composables/useCameraStream.ts` · `useDeviceOrientation.ts` | Beta: sun path over the rear camera, calibration, times table as text alternative                    |

## Data flow

1. Load → `useViewState` parses `route.query` → `state` (`composables/useViewState.ts:9`).
2. `state` change → debounced 300 ms `router.replace` (`composables/useViewState.ts:5,20-23`); `lastWritten` marks the echo.
3. `route.fullPath` change not equal to `lastWritten` → re-parse into `state` (`composables/useViewState.ts:29-34`). Back/forward + shared links land here.
4. `state` → `viewStateToDate` → `readSun` → sheet readouts + map bearing lines (`pages/index.vue:26`).
5. Day times computed at 12:00 of the chosen date → slider moves skip the crossing scan (`pages/index.vue:19`).
6. Map tap → `handleSelect` → `state` lat/lon (`pages/index.vue:39`).
7. Place search pick → `PlaceSearch` `update` → `SunSheet` `place` → `handleSelect` (`components/SunSheet.vue:94`); the `SunMap` `point` watcher recentres the map.
8. Bare URL → `onMounted` → `zonePlace(deviceTimeZone())` (lazy `utils/zoneCoords` chunk, generated by `scripts/gen-zone-coords.mjs`) → `adoptStart` moves lat/lon under `isSilent`, no URL write; refused if the URL has lat/lon or the place already changed (`pages/index.vue`, `composables/useViewState.ts`). Amsterdam, UTC and unknown zones keep Dam Square. An adopted start sets the polite `.page__start-note` status ("Starting near <city>, from your time zone"; city = last zone-id segment).
9. Sky view → `pages/sky.vue` reads the same query through `useViewState` (never writes it). `SkyCanvas` (client only) starts camera and sensors from one tap. Pipeline per frame: `useDeviceOrientation` raw pose (`utils/deviceOrientation.ts`) → `applyOffsets` (`utils/skyCalibration.ts`) → `projectPath` / `projectSkyPoint` (`utils/skyProjection.ts`, pinhole, FOV slider 40-90, default 63) over arcs from `sampleSunPath` (`utils/skyPath.ts`: selected day plus 21 June and 21 December) → 2D canvas over the `<video>`. Split by job: status merge `utils/skyAccess.ts` (`combineAccessStatus`), calibration state `composables/useSkyCalibration.ts`, arcs + drawing `utils/skyDraw.ts` (`buildArcs`, `drawSkyOverlay`); `SkyCanvas` keeps refs, lifecycle, focus and template <!-- enggflo -->. Redraw runs on `requestAnimationFrame` only when the pose, offsets, FOV or size change; there is no animation loop and no CSS motion. The sun-now marker uses `new Date()`, never the URL time. `SkyTimesTable` lists the same arcs at full hours (sun up only) as the accessible alternative to the canvas.

## i18n routing

- Dutch (`nl`) is the default and unprefixed; English lives under `/en`. Strategy `prefix_except_default`, `detectBrowserLanguage: false`: no cookie, no stored locale.
- Detection rule (`utils/langRedirect.ts`, inline head script, tested as the exact string): redirect to `/en` + path + query + hash only on a fresh document load (no same-origin referrer and `history.state === null`) when `navigator.languages` holds no `nl*` entry (nl-BE counts as Dutch). Already under `/en` or any in-app navigation: no redirect.
- Trade-off: a script instead of the module redirect. It runs before first paint (no Dutch flash) and needs no cookie, so a language chosen with the switcher survives a reload (`history.state` is set by in-app navigation). Cost: a visitor who types a bare Dutch URL by hand with a non-Dutch browser is sent to `/en`; a no-JS visitor sees Dutch. Visible `hreflang` links and the switcher are the escape hatch.
- Crawler decision: Option A, no user-agent exemption; the redirect stays. Indexing: Dutch at `/`, English at `/en`, paired by hreflang (`x-default` and `nl`/`nl-NL` → `https://zonkant.engg.app`; `en`/`en-GB` → `/en`). WHY: hreflang already declares the pair, nothing reads `navigator.userAgent`, privacy copy unchanged. Decided: 2026-11-07. Recheck when Search Console shows Dutch impressions/clicks dropping, or `/en` ranking for Dutch queries.
- Loading: one `i18n/locales/<locale>.ts` loader per locale spreads `app`, `legal`, `sky` into a fresh object. WHY: listing several JSON `files` per locale made the module merge into a read-only JSON module (`Cannot assign to read only property`, build exit 0). Top-level keys must not overlap across the three files. <!-- enggflo -->
- Preload: `experimental.preload` embeds messages in the HTML (~20 KB per page) so hydration does not wait on a request. Cost: slower hydration; e2e waits for `.ol-viewport` before typing. <!-- enggflo -->
- Strings: `i18n/locales/<locale>/*.json`, identical keys and `{placeholders}` in both (enforced). Numbers, times and compass names go through `utils/format.ts`, which takes the locale; components read it via `useAppLocale()` (strict `nl` match, else `en`) <!-- enggflo -->. Tests run with `defaultLocale: 'en'` (`vitest.config.ts`); Dutch component tests mount with `route: '/nl'`.

## Sky view beta limits

- Phone compasses are often off by 10 degrees or more; the page warns until the user calibrates by pointing at the sun and tapping Calibrate (offsets in memory only, reset on reload). Heading nudge is +/-1 degree. Calibrate is refused while the sun is below the horizon.
- FOV is a slider, not measured; lens distortion, magnetic declination, buildings and occlusion are not modelled. Camera and sensors need a secure context and a user tap; desktop shows a status message and the table.
- Frames stay in the `<video>`: no `toDataURL`, `toBlob`, `MediaRecorder`, `ImageCapture` or network call (keep it so; grep the sky files for these names). `Permissions-Policy` allows `camera=(self)` and the motion sensors.

## Key decisions

- Static output, no server. WHY: nothing to compute server-side; Worker serves assets. `nuxt.config.ts:46`
- Map client-only inside `<ClientOnly>`. WHY: changing bottom-inset prop crashed mobile hydration. `pages/index.vue:50-51`
- `ol-mapbox-style` gets `webfonts: '/map-fonts.css'`. WHY: else it injects jsDelivr font links. `components/SunMap.client.vue:218-222`
- Single tile origin `tiles.openfreemap.org`, no key. `components/SunMap.client.vue:29`
- Geocoder = Photon public instance `photon.komoot.io`, called from the browser; only the typed text is sent (no lat/lon bias). WHY: OSM addresses + POIs, CORS `*`, no key, no server needed. REJECTED: Open-Meteo geocoding (GeoNames: no addresses/POIs). `utils/geocode.ts`, CSP `public/_headers:7`
- No storage of any kind. WHY: privacy page promise. enforced_by: `tests/unit/noStorage.spec.ts:16`
- `<NuxtLink>` prefetch on interaction (hover/focus), not visibility. WHY: links go to rarely visited legal pages; visibility prefetch fetched every legal chunk when the sheet/footer scrolled into view. `nuxt.config.ts:38-43`
- Build-level `<link rel="prefetch">` tags in prerendered HTML remain (Nuxt default, browser idle-time). Accepted.
