# Deployment

Zonkant is not deployed yet. When it is, https://zonkant.engg.app will be a Cloudflare Worker that serves static assets, on the sg208 Cloudflare account. Deploy from `main` only.

Nothing is bound until `pnpm run deploy` is run by hand: there is no CI, no remote and no domain binding in this repository.

## Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

`pnpm build` runs `nuxt generate`. The output goes to `.output/public`. The build needs no network: Zonkant has one page plus four legal pages, all prerendered, and sun positions are calculated in the browser.

## Deploy

`wrangler.jsonc` points the Worker at `.output/public` and binds it to the `zonkant.engg.app` custom domain. `workers_dev` and preview URLs are off.

```bash
pnpm run deploy   # pnpm generate, then wrangler deploy
```

Requirements:

- `wrangler` v4, installed globally or as a dev dependency
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set in the environment
- the `engg.app` zone in the same Cloudflare account, so the custom domain can be created

## Headers

`public/_headers` sets HSTS, nosniff, a referrer policy, `X-Frame-Options: DENY`, a Permissions-Policy and a Content-Security-Policy in Report-Only mode. Two choices differ from the pokedex project:

- `geolocation=(self)`, because "Locate me" needs the browser location prompt.
- The CSP allows `https://tiles.openfreemap.org` for images and fetches, and `worker-src 'self' blob:` for the map's tile workers.

The CSP is Report-Only on purpose. Before enforcing it, run `pnpm exec wrangler dev` on the built output, load `/`, use the map and read the browser console for violations. `npx serve` does not deliver `_headers`.

## Missing pages

Unknown paths get the real `404.html` (`not_found_handling: "404-page"`), prerendered from `error.vue`.

## Rollback

- Run `wrangler rollback` to return to the previous version, or redeploy the previous commit from `main`.
- To take the site down, run `wrangler delete --name zonkant` and remove the `zonkant.engg.app` custom domain.
- Before the first deploy, deleting `wrangler.jsonc` and `public/_headers` is enough.

The site is static assets, so there is no data to lose.

## Local check

```bash
pnpm build
pnpm preview
```

## Troubleshooting

- Dependency errors: delete `node_modules`, run `pnpm install` again, and check that you are on the Node version in `.node-version`.
- No `.output/public` after `pnpm build`: look for build errors in the console.
- Map stays blank: tiles come from `tiles.openfreemap.org`; check the network tab and the CSP report in the console.
