import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '~/utils/palette';

const css = readFileSync('assets/css/main.css', 'utf8');

const tokenHex = (name: string): string | undefined =>
  new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css)?.[1];

const channel = (value: number): number => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    channel(parseInt(hex.slice(i, i + 2), 16))
  );
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

describe('palette', () => {
  it('mirrors every --token in main.css with the same hex', () => {
    const entries = Object.entries(PALETTE);
    expect(entries.length).toBeGreaterThanOrEqual(12);
    for (const [name, hex] of entries) {
      expect(tokenHex(name), `--${name}`).toBe(hex);
    }
  });

  it('keeps text at 4.5:1 on its ground', () => {
    expect(contrast(PALETTE.ink, PALETTE.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(PALETTE.ink, PALETTE.surface)).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(PALETTE['ink-soft'], PALETTE.ground)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(PALETTE['ink-soft'], PALETTE.surface)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(PALETTE['accent-ink'], PALETTE.accent)
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every sun line at 3:1 on each Positron map ground', () => {
    const grounds = [
      PALETTE['map-ground'],
      PALETTE['map-park'],
      PALETTE['map-wood'],
      PALETTE['map-water'],
    ];
    const lines = [
      PALETTE['line-sunrise'],
      PALETTE['line-sunset'],
      PALETTE['line-sun'],
      PALETTE['line-shadow'],
    ];
    for (const line of lines) {
      for (const ground of grounds) {
        expect(
          contrast(line, ground),
          `${line} on ${ground}`
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('tells the four lines apart by hue family (all distinct hex)', () => {
    const lines = [
      PALETTE['line-sunrise'],
      PALETTE['line-sunset'],
      PALETTE['line-sun'],
      PALETTE['line-shadow'],
    ];
    expect(new Set(lines).size).toBe(4);
  });
});
