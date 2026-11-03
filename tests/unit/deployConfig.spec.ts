import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string): string =>
  readFileSync(resolve(process.cwd(), file), 'utf8');

interface HeaderBlock {
  path: string;
  headers: Record<string, string>;
}

// Cloudflare format: unindented line = URL pattern, indented `Name: value` = header
const parseHeaders = (text: string): HeaderBlock[] => {
  const blocks: HeaderBlock[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      blocks.push({ path: line.trim(), headers: {} });
      continue;
    }
    const current = blocks.at(-1);
    const separator = line.indexOf(':');
    if (!current || separator === -1) throw new Error(`Bad line: ${line}`);
    current.headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return blocks;
};

const blocks = parseHeaders(read('public/_headers'));
const all = blocks.find((block) => block.path === '/*')?.headers ?? {};
const csp = all['content-security-policy-report-only'] ?? '';
const directive = (name: string): string =>
  csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? '';

describe('wrangler.jsonc', () => {
  const wrangler = read('wrangler.jsonc');

  it('binds the custom domain to the static assets with a real 404', () => {
    expect(wrangler).toContain('"name": "zonkant"');
    expect(wrangler).toContain('"pattern": "zonkant.engg.app"');
    expect(wrangler).toContain('"custom_domain": true');
    expect(wrangler).toContain('"directory": ".output/public"');
    expect(wrangler).toContain('"not_found_handling": "404-page"');
  });

  it('does not publish on workers.dev or preview urls', () => {
    expect(wrangler).toContain('"workers_dev": false');
    expect(wrangler).toContain('"preview_urls": false');
  });
});

describe('public/_headers', () => {
  it('sets security headers for every path', () => {
    expect(all['strict-transport-security']).toBe('max-age=31536000');
    expect(all['x-content-type-options']).toBe('nosniff');
    expect(all['x-frame-options']).toBe('DENY');
    expect(all['referrer-policy']).toBeTruthy();
  });

  it('allows geolocation for this site only', () => {
    const policy = all['permissions-policy'] ?? '';
    expect(policy).toContain('geolocation=(self)');
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
  });

  it('reports CSP, never enforces it, and allows only the tile host', () => {
    expect(csp).toContain("default-src 'self'");
    for (const block of blocks) {
      expect(Object.keys(block.headers)).not.toContain(
        'content-security-policy'
      );
    }
    expect(directive('connect-src')).toContain('https://tiles.openfreemap.org');
    expect(directive('img-src')).toContain('https://tiles.openfreemap.org');
    expect(directive('worker-src')).toBe("worker-src 'self' blob:");
  });

  it('caches hashed build assets as immutable', () => {
    expect(blocks.find((block) => block.path === '/_nuxt/*')?.headers).toEqual({
      'cache-control': 'public, max-age=31536000, immutable',
    });
  });

  it('parser catches a bad file (guards the checks above)', () => {
    expect(() => parseHeaders('/*\n  no-colon')).toThrow();
    expect(parseHeaders('/a\n  X: 1')[0]?.headers).toEqual({ x: '1' });
  });
});

describe('runtime and notices', () => {
  it('pins Node 24', () => {
    expect(read('.node-version').trim()).toBe('24');
  });

  it('ships a licence and third-party notices naming every dependency', () => {
    expect(existsSync(resolve(process.cwd(), 'LICENSE'))).toBe(true);
    const notices = read('public/THIRD-PARTY-NOTICES.txt');
    for (const name of [
      'suncalc',
      'ol-mapbox-style',
      'OpenLayers',
      'TikTok Sans',
      'SIL OPEN FONT LICENSE',
      'Nuxt',
      'Vue',
    ]) {
      expect(notices, name).toContain(name);
    }
  });
});
