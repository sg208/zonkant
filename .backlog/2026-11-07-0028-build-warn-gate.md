# Fail the generate step on nuxt WARN lines

- **Date**: 2026-11-07 00:28
- **Type**: task
- **Effort**: easy
- **Status**: ready
- **Source**: review finding (`.enggflo/learning.md:91` `i18n-multi-file-readonly-merge`)

## Goal
- `pnpm generate` exits non-zero when `nuxt generate` prints a `WARN` line, so a read-only i18n merge cannot ship as a green build.

## Context
- `package.json:13` — `generate` = `nuxt generate`; `package.json:24` `build` = `nuxt generate`; `package.json:25` `deploy` runs `pnpm generate`, so a gate on `build` alone misses deploy.
- `.enggflo/learning.md:92` — 13× `Failed to load messages … Cannot assign to read only property` logged with exit 0; `:97` marks the gate `enforced_by: unverified`.
- `nuxt.config.ts:36` and `:42` — `file: 'nl.ts'` / `'en.ts'` (one loader per locale); `i18n/locales/nl.ts:8` is the single-loader form.
- `nuxt.config.ts` is modified in the working tree (`git status`: `MM nuxt.config.ts`) and `i18n/locales/nl.ts` exists on disk; D-2 reads the working tree, so the green state holds before commit.
- No CI: `.github/` absent, so nothing runs a warn gate today.
- Pattern to follow: `scripts/gen-zone-coords.mjs:1-8` (node script, usage line, throws on bad args); `tests/unit/deployConfig.spec.ts:5-6` (source-read spec helper).

## Proposed approach
1. Capture one `pnpm generate` log with the current loaders to confirm the exact `WARN` prefix after ANSI strip; expect zero WARN lines · files: `scripts/` (scratch only) · satisfies: D-2
2. Add `scripts/check-build-warnings.mjs`: reads output, strips ANSI, fails on a line starting with `WARN`, unless it matches an allowlist entry `{ pattern, reason }`; the allowlist starts empty · files: `scripts/check-build-warnings.mjs` · satisfies: D-1, D-2
3. Add `scripts/generate-checked.mjs` that spawns `nuxt generate`, mirrors output to the terminal, and exits 1 on a non-zero exit or any unallowlisted WARN; the failure message names the fix: "one loader per locale (`i18n/locales/<code>.ts`), never several JSON `files` per locale" · files: `scripts/generate-checked.mjs` · satisfies: D-1, D-3
4. Point `package.json:13` `generate` at `node scripts/generate-checked.mjs` and `package.json:24` `build` at `pnpm generate`; `deploy` inherits the gate · files: `package.json` · satisfies: D-3, D-4
5. Add `tests/unit/buildWarnings.spec.ts` with three fixtures: a WARN line (red), info-only output (green), an allowlisted WARN (green) · files: `tests/unit/buildWarnings.spec.ts` · satisfies: D-1

- Cheaper option: a `verify:build` script run by hand, no spawn wrapper; loses the gate on `pnpm generate`/deploy. Not recommended.

## Done when
| id | check | expect |
|---|---|---|
| D-1 | `pnpm vitest run tests/unit/buildWarnings.spec.ts` | exit 0 · 3 tests pass (WARN red with fix message, info-only green, allowlisted green) |
| D-2 | `pnpm generate 2>&1 \| node scripts/check-build-warnings.mjs; echo $?` on the current loaders | `0` · WARN count in output = 0 |
| D-3 | in a scratch worktree (not the working tree), set `i18n/locales` `nl` to `files: ['nl/app.json','nl/legal.json','nl/sky.json']` in `nuxt.config.ts:36`, run `pnpm build` | exit 1 · output contains `single loader per locale` |
| D-4 | `pnpm lint && pnpm format:check` | exit 0 |

## Open questions
- none

## Also spotted
- `design.md:21` — i18n row still lists `i18n/locales/{nl,en}/{app,legal,sky}.json` as the loader source; stale now that `i18n/locales/{nl,en}.ts` exist.
- `design.md:41` — "Strings: `i18n/locales/<locale>/*.json`" is stale for the same reason.
