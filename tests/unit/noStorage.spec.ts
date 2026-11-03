import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const sourceDirs = [
  'pages',
  'components',
  'composables',
  'layouts',
  'utils',
  'types',
  'plugins',
];
const sourceFiles = ['app.vue', 'error.vue', 'app.config.ts'];
const forbidden =
  /localStorage|sessionStorage|document\.cookie|indexedDB|console\.log/;

const walk = (dir: string): string[] => {
  const absolute = resolve(root, dir);
  try {
    statSync(absolute);
  } catch {
    return [];
  }
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
};

const files = [...sourceDirs.flatMap(walk), ...sourceFiles];

describe('no storage or logging in source', () => {
  it('scans real source files', () => {
    expect(files).toContain('pages/privacy.vue');
    expect(files).toContain('components/AppFooter.vue');
  });

  it('matches every forbidden API (guards the scan below)', () => {
    for (const sample of [
      'localStorage.setItem()',
      'sessionStorage.x',
      'document.cookie = 1',
      'indexedDB.open()',
      'console.log(1)',
    ]) {
      expect(forbidden.test(sample)).toBe(true);
    }
  });

  it('finds none in source dirs', () => {
    const hits = files.filter((file) => {
      try {
        return forbidden.test(readFileSync(resolve(root, file), 'utf8'));
      } catch {
        return false;
      }
    });
    expect(hits).toEqual([]);
  });
});
