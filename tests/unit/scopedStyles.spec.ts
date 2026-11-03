import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vue compiles `:global(.a) .b` to a bare global `.a`, dropping `.b`.
// MoveList once shipped `.reveal-pending{transform:scaleX(0)}` that way and
// squashed every pending section to zero width.
const GLOBAL_WITH_DESCENDANT = /:global\([^)]*\)\s+[^\s{,]/;

const vueFiles = (dir: string): string[] =>
  !existsSync(dir)
    ? []
    : readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return vueFiles(path);
        return entry.name.endsWith('.vue') ? [path] : [];
      });

describe('scoped styles', () => {
  it('never combine :global(...) with a descendant selector', () => {
    const offenders = ['components', 'pages', 'layouts']
      .flatMap((dir) => vueFiles(dir))
      .concat(['app.vue', 'error.vue'].filter((file) => existsSync(file)))
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ file, line: i + 1, text: line }))
          .filter(({ text }) => GLOBAL_WITH_DESCENDANT.test(text))
      )
      .map(({ file, line }) => `${file}:${line}`);
    // Fix: write a plain `.a .b` selector; scoped CSS only tags the last part
    expect(offenders).toEqual([]);
  });
});
