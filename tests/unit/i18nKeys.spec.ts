import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILES = ['app', 'legal', 'sky'] as const;
const root = process.cwd();

type Messages = { [key: string]: string | Messages };

const load = (locale: string, file: string): Messages =>
  JSON.parse(
    readFileSync(resolve(root, `i18n/locales/${locale}/${file}.json`), 'utf8')
  ) as Messages;

const flatten = (messages: Messages, prefix = ''): Map<string, string> => {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.set(path, value);
    else
      for (const [nested, text] of flatten(value, path)) {
        entries.set(nested, text);
      }
  }
  return entries;
};

// Named placeholders such as {city}; plural bars are not compared
const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

const merged = (locale: string): Map<string, string> =>
  new Map(FILES.flatMap((file) => [...flatten(load(locale, file))]));

describe('locale files', () => {
  it('ships the same key set in nl and en', () => {
    expect([...merged('nl').keys()].sort()).toEqual(
      [...merged('en').keys()].sort()
    );
  });

  it('uses identical placeholders per key', () => {
    const english = merged('en');
    for (const [key, dutch] of merged('nl')) {
      expect(placeholders(dutch), key).toEqual(
        placeholders(english.get(key) ?? '')
      );
    }
  });

  it('has no empty strings', () => {
    for (const locale of ['nl', 'en']) {
      for (const [key, text] of merged(locale)) {
        expect(text.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('actually carries messages (guards the loops above)', () => {
    expect(merged('en').size).toBeGreaterThan(0);
    expect(placeholders('Near {city} at {time}')).toEqual(['city', 'time']);
  });

  it('exists for every configured file', () => {
    for (const locale of ['nl', 'en']) {
      for (const file of FILES) {
        const path = resolve(root, `i18n/locales/${locale}/${file}.json`);
        expect(existsSync(path)).toBe(true);
      }
    }
  });
});

describe('nuxt.config i18n', () => {
  const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8');

  it('is Dutch by default, prefixes English, and never detects or stores a locale', () => {
    expect(config).toContain("defaultLocale: 'nl'");
    expect(config).toContain("strategy: 'prefix_except_default'");
    expect(config).toContain('detectBrowserLanguage: false');
  });

  it('does not hard-code the html lang', () => {
    expect(config).not.toMatch(/htmlAttrs:\s*\{\s*lang/);
  });
});
