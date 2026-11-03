// Mirrors the `--*` colour tokens in assets/css/main.css (checked by
// tests/unit/palette.spec.ts). OpenLayers draws on canvas and cannot read CSS
// variables, so the sun-line colours live here as well.
export const PALETTE = {
  ground: '#f2f3f0',
  surface: '#e4e7e2',
  ink: '#14181c',
  'ink-soft': '#4a5258',
  accent: '#a8340a',
  'accent-ink': '#ffffff',
  focus: '#14181c',
  // OpenFreeMap Positron fills, sampled from
  // https://tiles.openfreemap.org/styles/positron
  'map-ground': '#f2f3f0',
  'map-park': '#e6e9e5',
  'map-wood': '#dce0dc',
  'map-water': '#c2c8ca',
  // Sun lines drawn on the map
  'line-sunrise': '#7a5200',
  'line-sunset': '#a3123f',
  'line-sun': '#b04000',
  'line-shadow': '#1f2d3a',
} as const;

export type PaletteName = keyof typeof PALETTE;
