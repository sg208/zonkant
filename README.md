# Zonkant

Find the sunny side. A sun and shadow planner: tap a point on the map to draw the sunrise, sunset, current sun and shadow directions, and read the sun's height, key times and shadow length. Live at https://zonkant.engg.app.

- Tap the map, search for a city, address or place, type coordinates or use "Locate me"
- Pick a date and time with a keyboard-friendly slider
- Read sun height, direction, sunrise, sunset, golden and blue hours, day length and the shadow of a 1 m object
- Sky view (Beta): hold a phone up and see the sun's path over the camera, with a times table as text alternative
- Dutch at `/`, English at `/en`: first visit with a non-Dutch browser goes to `/en`; nothing is stored
- Share the view: place, date and time live in the page address
- Nothing is stored. The browser only sends map tile requests and, when you search, the search text to [Photon](https://photon.komoot.io)

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

## Languages

Dutch is the default and lives at the root; English lives under `/en`. A small inline script sends a first visit to `/en` when the browser's language list has no Dutch entry. It only acts on a fresh page load, uses no cookie or storage, and a language picked with the switcher survives a reload. Texts are in `i18n/locales/{nl,en}/`; both languages must carry the same keys.

## Sky view (Beta)

`/sky` (`/en/sky`) draws the sun's path for the chosen date and for both solstices over the rear camera. The camera and orientation sensors start only after a tap, frames never leave the device and nothing is recorded. The compass is often off by 10 degrees or more: point at the sun and tap Calibrate, then fine-tune with the +/-1 degree buttons. It needs a phone or tablet over https; on a desktop the page shows a message and the times table.

## Structure

- `pages/` routes
- `layouts/` `default` (header, footer) and `app` (full-screen map shell)
- `components/` UI components
- `composables/` view state, geolocation, place search, camera stream and device orientation
- `utils/` sun maths, formatting, URL state, map geometry, Photon geocoding and the sky view maths (`sky*.ts`)
- `i18n/locales/` Dutch and English texts
- `tests/` unit, component and end-to-end tests

## Data and credits

Map data is from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL). Tiles come from [OpenFreeMap](https://openfreemap.org) and [OpenMapTiles](https://www.openmaptiles.org/). Place search uses [Photon](https://photon.komoot.io) by komoot, on OpenStreetMap data. Libraries and the font are credited on the site's credits page, and their licence texts are in [public/THIRD-PARTY-NOTICES.txt](public/THIRD-PARTY-NOTICES.txt).

## Licence

MIT © Syailendra Ginting
