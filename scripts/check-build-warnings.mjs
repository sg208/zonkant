// Usage: pnpm generate 2>&1 | node scripts/check-build-warnings.mjs
// Fails when `nuxt generate` output holds a WARN line that is not allowlisted.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Entries: { pattern: RegExp, reason: string }. Add one only with a reason.
export const allowlist = [];

export const fixHint =
  'Build printed WARN lines. If they mention "Failed to load messages" or ' +
  '"read only property", the i18n config needs a single loader per locale: ' +
  'one loader per locale (`i18n/locales/<code>.ts`), never several JSON ' +
  '`files` per locale. Otherwise fix the warning, or allowlist it with a ' +
  'reason in scripts/check-build-warnings.mjs.';

const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
// consola prints WARN as a badge; the line starts with it (after ANSI strip)
const warnPrefix = /^\s*WARN\s/;

export const checkOutput = (output, entries = allowlist) => {
  const warnings = output
    .replace(ansiPattern, '')
    .split(/\r?\n/)
    .filter((line) => warnPrefix.test(line))
    .filter((line) => !entries.some((entry) => entry.pattern.test(line)))
    .map((line) => line.trim());
  const ok = warnings.length === 0;
  const message = ok ? '' : `${warnings.join('\n')}\n${fixHint}`;
  return { ok, warnings, message };
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const result = checkOutput(readFileSync(0, 'utf8'));
  process.stdout.write(`WARN lines: ${result.warnings.length}\n`);
  if (!result.ok) {
    process.stderr.write(`${result.message}\n`);
    process.exit(1);
  }
}
