import { describe, expect, it } from 'vitest';
import { checkOutput } from '../../scripts/check-build-warnings.mjs';

// Real shape from `nuxt generate` with several JSON `files` for one locale (2026-11-07)
const warnLine =
  " WARN  Failed to load messages for locale \"nl\" Cannot assign to read only property 'updated' of object '#<Object>'";

describe('check-build-warnings', () => {
  it('fails on a WARN line and tells how to fix the loader', () => {
    const result = checkOutput(
      ['● Preparing app', warnLine, '✔ You can now deploy'].join('\n')
    );

    expect(result.ok).toBe(false);
    expect(result.warnings).toEqual([warnLine.trim()]);
    expect(result.message).toContain('single loader per locale');
    expect(result.message).toContain('i18n/locales/<code>.ts');
  });

  it('passes info-only output, even with "warn" mid-line', () => {
    const result = checkOutput(
      [
        '● Preparing app',
        'ℹ Building client...',
        'ℹ nothing to warn about here',
        '',
      ].join('\r\n')
    );

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('passes a WARN line that matches an allowlist entry', () => {
    const result = checkOutput(warnLine, [
      { pattern: /Failed to load messages for locale "nl"/, reason: 'test' },
    ]);

    expect(result.ok).toBe(true);
  });
});
