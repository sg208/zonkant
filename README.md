# Zonkant

Find the sunny side. A sun and shadow planner: tap a point on the map to draw the sunrise, sunset, current sun and shadow directions, and read the sun's height, key times and shadow length. Planned for https://zonkant.engg.app (not deployed yet).

- Tap the map, type coordinates or use "Locate me"
- Pick a date and time with a keyboard-friendly slider
- Read sun height, direction, sunrise, sunset, golden and blue hours, day length and the shadow of a 1 m object
- Share the view: place, date and time live in the page address
- Nothing is stored or sent anywhere except map tile requests

Estimates assume flat ground with no buildings, and times are shown in your device's time zone.

## Stack

- Nuxt 4 with plain CSS tokens
- OpenLayers with an OpenFreeMap Positron style, through `ol-mapbox-style`
- `suncalc` for sun positions
- TikTok Sans, self-hosted through `@fontsource-variable`
- Vitest and `@nuxt/test-utils`, Playwright for end-to-end tests
- Cloudflare Worker serving static assets

## Scripts

```bash
pnpm install --frozen-lockfile   # install dependencies
pnpm dev                         # dev server
pnpm build                       # nuxt generate, output in .output/public
pnpm preview                     # serve the built site locally
pnpm type-check                  # TypeScript check
pnpm lint                        # lint
pnpm test                        # run unit and component tests
pnpm test:e2e                    # build, then run Playwright
pnpm format                      # format with Prettier
pnpm run deploy                  # build and deploy to Cloudflare
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for how deploys work.

## Structure

- `pages/` routes
- `layouts/` `default` (header, footer) and `app` (full-screen map shell)
- `components/` UI components
- `composables/` view state and geolocation
- `utils/` sun maths, formatting, URL state and map geometry
- `tests/` unit, component and end-to-end tests

## Data and credits

Map data is from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Tiles come from [OpenFreeMap](https://openfreemap.org) and [OpenMapTiles](https://www.openmaptiles.org/). Libraries and the font are credited on the site's credits page, and their licence texts are in [public/THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt).

## Licence

MIT © Syailendra Ginting
