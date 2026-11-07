# Decide whether crawlers skip the first-visit language redirect

- **Date**: 2026-11-07 00:40
- **Type**: task
- **Effort**: medium
- **Status**: open
- **Source**: request

## Goal

- A search crawler that fetches `/` gets a recorded, deliberate outcome: the Dutch page stays indexed under `/`, with the English page reachable via hreflang.

## Context

- `utils/langRedirect.ts:12-16` — the only exemption is a same-origin referrer; no user-agent or crawler check exists.
- `utils/langRedirect.ts:17-23` — a fresh load whose `navigator.languages` has no `nl*` entry is sent to `/en`; a JS-running crawler reporting no Dutch takes the same path (rule-based inference, not measured).
- `nuxt.config.ts:22-29` — `defaultLocale: 'nl'`, `prefix_except_default`, `detectBrowserLanguage: false`; the inline script is the only language detection.
- `design.md:40` — the accepted trade-off names bare Dutch URLs with a non-Dutch browser; crawlers are not mentioned.
- `tests/unit/langRedirect.spec.ts:28-31` — the fake navigator has no `userAgent`, so a crawler case needs that field added; `:45-113` has 17 cases, none for a crawler.
- `.output/public/index.html:1` — the same script bytes ship inline; hreflang `x-default` and `nl`/`nl-NL` point to `https://zonkant.engg.app`, `en`/`en-GB` to `/en`.
- `commit fce2a08` — shipped the redirect; the crawler gap is not covered by it, so this item is partial, not shipped.
- Duplicate check: no open `.backlog/` or `.done/` item on this topic (`.backlog/2026-11-07-0028-build-warn-gate.md`, `.done/2026-11-03-0709-useviewstate-owns-query-reparse.md` are unrelated).
- Recheck trigger: Search Console shows Dutch URL impressions or clicks dropping, or `/en` pages ranking for Dutch queries — reopen this item.

## Proposed approach

1. Choose option A or B and record the decision as a line starting `Crawler decision:` under the i18n section · files: `design.md` · satisfies: D-1, D-4
2. Option A (no code): keep the redirect as is; confirm hreflang still ships in the build · files: none (build output only) · satisfies: D-3
3. Option B only: add `userAgent` to the spec helper, then return early in the inline script for a named crawler pattern (Googlebot, bingbot) before the language check · files: `utils/langRedirect.ts`, `tests/unit/langRedirect.spec.ts` · satisfies: D-2
4. Option B only: review the privacy copy, since the script now reads `navigator.userAgent`; nothing is stored or sent · files: `i18n/locales/{nl,en}/legal.json` (`design.md:21`), `.output/public/index.html:1` (current wording) · satisfies: D-4

- Cheaper option: option A with no code change; hreflang already declares the Dutch/English pair. | none

## Done when

| id  | check                                                                             | expect                                                                                                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D-1 | `grep -c 'Crawler decision:' design.md`                                           | `1` · one decision line recorded                                                                                                |
| D-2 | option B only: `pnpm vitest run tests/unit/langRedirect.spec.ts -t crawler`       | exit 0 · at least one crawler test passes, and a Googlebot user agent on `/` leaves `replacedWith` null; skipped under option A |
| D-3 | `pnpm build && grep -o 'hreflang="x-default"' .output/public/index.html \| wc -l` | `1` · x-default alternate still in static HTML                                                                                  |
| D-4 | `pnpm format:check`                                                               | exit 0 · covers the edited `design.md`                                                                                          |

## Open questions

- Option A (keep the redirect, rely on hreflang) or option B (exempt crawlers by user agent in the inline script)?
- Does Googlebot's rendered page report an `nl` language? Check Search Console URL Inspection; if it does not, option A is likely enough.

## Also spotted

- `design.md:21` — i18n row still lists `i18n/locales/{nl,en}/{app,legal,sky}.json` as the loader source; stale since `i18n/locales/{nl,en}.ts` (also in `.backlog/2026-11-07-0028-build-warn-gate.md`).
