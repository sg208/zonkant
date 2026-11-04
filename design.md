# design.md

<!-- enggflo -->

PURPOSE: architecture, data flow, key decisions. Reader = acting agent. Decision history → `.enggflo/brain.md`.

## Architecture

| Layer     | Path                                                                                                                 | Role                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| build     | `nuxt.config.ts:46-50`                                                                                               | `nuxt generate` prerenders 5 routes; `crawlLinks: false`                                             |
| deploy    | `wrangler.jsonc:4-8`                                                                                                 | Worker static assets from `.output/public`; custom domain only                                       |
| headers   | `public/_headers:1-7`                                                                                                | HSTS, nosniff, frame deny, Permissions-Policy, CSP Report-Only                                       |
| page      | `pages/index.vue`                                                                                                    | owns view state; derives sun reading + day times; renders map/sheet                                  |
| map       | `components/SunMap.client.vue:200`                                                                                   | OL `Map`; base layers from OpenFreeMap style; sun-line `VectorLayer` (`:172`)                        |
| sheet     | `components/SunSheet.vue` · `SunPanel.vue` · `TimeControls.vue` · `PlaceSearch.vue` · `PlaceInputs.vue`              | readouts and inputs                                                                                  |
| sun maths | `utils/sun.ts:11` `readSun` · `:63` `getDayTimes` · `:120` `shadowLength` · `utils/sunLines.ts:14`                   | suncalc adapter; pure functions                                                                      |
| URL state | `utils/urlState.ts:53` `parseViewState` · `:69` `toQuery` · `composables/useViewState.ts:9`                          | query ↔ state                                                                                        |
| location  | `composables/useGeolocation.ts:15`                                                                                   | browser geolocation; never stored                                                                    |
| search    | `utils/geocode.ts` `buildSearchUrl` · `parsePhoton` · `composables/usePlaceSearch.ts` · `components/PlaceSearch.vue` | Photon geocoding; 350 ms debounce, min 3 chars, 6 results, stale requests aborted; WAI-ARIA combobox |

## Data flow

1. Load → `useViewState` parses `route.query` → `state` (`composables/useViewState.ts:9`).
2. `state` change → debounced 300 ms `router.replace` (`composables/useViewState.ts:5,20-23`); `lastWritten` marks the echo.
3. `route.fullPath` change not equal to `lastWritten` → re-parse into `state` (`composables/useViewState.ts:29-34`). Back/forward + shared links land here.
4. `state` → `viewStateToDate` → `readSun` → sheet readouts + map bearing lines (`pages/index.vue:26`).
5. Day times computed at 12:00 of the chosen date → slider moves skip the crossing scan (`pages/index.vue:19`).
6. Map tap → `handleSelect` → `state` lat/lon (`pages/index.vue:39`).
7. Place search pick → `PlaceSearch` `update` → `SunSheet` `place` → `handleSelect` (`components/SunSheet.vue:94`); the `SunMap` `point` watcher recentres the map.

## Key decisions

- Static output, no server. WHY: nothing to compute server-side; Worker serves assets. `nuxt.config.ts:46`
- Map client-only inside `<ClientOnly>`. WHY: changing bottom-inset prop crashed mobile hydration. `pages/index.vue:50-51`
- `ol-mapbox-style` gets `webfonts: '/map-fonts.css'`. WHY: else it injects jsDelivr font links. `components/SunMap.client.vue:218-222`
- Single tile origin `tiles.openfreemap.org`, no key. `components/SunMap.client.vue:29`
- Geocoder = Photon public instance `photon.komoot.io`, called from the browser; only the typed text is sent (no lat/lon bias). WHY: OSM addresses + POIs, CORS `*`, no key, no server needed. REJECTED: Open-Meteo geocoding (GeoNames: no addresses/POIs). `utils/geocode.ts`, CSP `public/_headers:7`
- No storage of any kind. WHY: privacy page promise. enforced_by: `tests/unit/noStorage.spec.ts:16`
- `<NuxtLink>` prefetch on interaction (hover/focus), not visibility. WHY: links go to rarely visited legal pages; visibility prefetch fetched every legal chunk when the sheet/footer scrolled into view. `nuxt.config.ts:38-43`
- Build-level `<link rel="prefetch">` tags in prerendered HTML remain (Nuxt default, browser idle-time). Accepted.
