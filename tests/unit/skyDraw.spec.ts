import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildArcs, drawSkyOverlay } from '~/utils/skyDraw';
import { readSun } from '~/utils/sun';
import type { CameraPose, Viewport } from '~/types/sky';

const LAT = 52.37;
const LON = 4.9;
const SUN_NOW_COLOUR = 'rgb(255, 212, 0)';
const VIEWPORT: Viewport = { width: 400, height: 800 };
const SOUTH_POSE: CameraPose = { headingDeg: 180, pitchDeg: 30, rollDeg: 0 };

interface Operation {
  name: string;
  args: unknown[];
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;
  lineCap: string;
}

// Records every canvas call together with the style it was made under
const createRecordingContext = (): {
  context: CanvasRenderingContext2D;
  operations: Operation[];
} => {
  const operations: Operation[] = [];
  const state = {
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: '',
  };
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      operations.push({
        name,
        args,
        strokeStyle: state.strokeStyle,
        fillStyle: state.fillStyle,
        lineWidth: state.lineWidth,
        lineCap: state.lineCap,
      });
    };
  const context = Object.assign(state, {
    setLineDash: record('setLineDash'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillRect: record('fillRect'),
    arc: record('arc'),
    strokeText: record('strokeText'),
    fillText: record('fillText'),
  }) as unknown as CanvasRenderingContext2D;
  return { context, operations };
};

const translate = (key: string): string => `label:${key}`;

const drawAt = (
  now: Date,
  options: { pose?: CameraPose; viewport?: Viewport; isCalibrated?: boolean }
): Operation[] => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  const { context, operations } = createRecordingContext();
  drawSkyOverlay(context, {
    arcs: buildArcs('2026-06-21', LAT, LON),
    pose: options.pose ?? SOUTH_POSE,
    viewport: options.viewport ?? VIEWPORT,
    fovDeg: 63,
    isCalibrated: options.isCalibrated ?? false,
    translate,
    lat: LAT,
    lon: LON,
  });
  return operations;
};

afterEach(() => {
  vi.useRealTimers();
});

describe('buildArcs', () => {
  const arcs = buildArcs('2026-06-21', LAT, LON);

  it('returns selected, june and december in that order', () => {
    expect(arcs.map((arc) => arc.id)).toEqual(['selected', 'june', 'december']);
  });

  it('keeps only points at or above the horizon', () => {
    for (const arc of arcs) {
      expect(arc.path.length).toBeGreaterThan(0);
      expect(arc.path.every((point) => point.altitudeDeg >= 0)).toBe(true);
    }
  });

  it('has a longer day in june than in december at 52 N', () => {
    const [, june, december] = arcs;
    expect(june!.path.length).toBeGreaterThan(december!.path.length);
  });
});

describe('drawSkyOverlay', () => {
  const NOON = new Date(2026, 5, 21, 13, 0);

  it('draws one label per arc in selected, june, december order', () => {
    const operations = drawAt(NOON, {});
    const labels = operations
      .filter(
        (operation) =>
          operation.name === 'fillText' &&
          String(operation.args[0]).startsWith('label:')
      )
      .map((operation) => operation.args[0]);
    expect(labels).toEqual([
      'label:sky.canvas.selected',
      'label:sky.canvas.june',
      'label:sky.canvas.december',
    ]);
  });

  it('places the selected label 12 px above its highest stroked point', () => {
    const operations = drawAt(NOON, {});
    const firstLabelIndex = operations.findIndex(
      (operation) => operation.name === 'fillText'
    );
    const selectedPoints = operations
      .slice(0, firstLabelIndex)
      .filter(
        (operation) =>
          operation.name === 'moveTo' || operation.name === 'lineTo'
      )
      .map((operation) => Number(operation.args[1]));
    const label = operations[firstLabelIndex]!;
    expect(label.args[2]).toBe(Math.min(...selectedPoints) - 12);
  });

  it('strokes each arc with its own dash and cap, round caps for december', () => {
    const operations = drawAt(NOON, { isCalibrated: true });
    const dashes = operations
      .filter((operation) => operation.name === 'setLineDash')
      .map((operation) => operation.args[0]);
    expect(dashes).toEqual([[], [], [18, 8], [], [2, 8], []]);
    const decemberStroke = operations.find(
      (operation) =>
        operation.name === 'stroke' && operation.strokeStyle === '#ffb3c7'
    );
    expect(decemberStroke?.lineCap).toBe('round');
  });

  it('dashes the selected arc until calibrated', () => {
    const operations = drawAt(NOON, { isCalibrated: false });
    const firstDash = operations.find(
      (operation) => operation.name === 'setLineDash'
    );
    expect(firstDash?.args[0]).toEqual([8, 8]);
  });

  it('paints the sun marker at the crosshair when the sun is up and in view', () => {
    const sun = readSun(NOON, LAT, LON);
    const pose: CameraPose = {
      headingDeg: sun.bearingDeg,
      pitchDeg: sun.altitudeDeg,
      rollDeg: 0,
    };
    const operations = drawAt(NOON, { pose });
    const markerFill = operations.find(
      (operation) =>
        operation.name === 'fill' && operation.fillStyle === SUN_NOW_COLOUR
    );
    expect(markerFill).toBeDefined();
    const markerArc = operations.find((operation) => operation.name === 'arc');
    expect(markerArc?.args[0]).toBeCloseTo(200, 3);
    expect(markerArc?.args[1]).toBeCloseTo(400, 3);
  });

  it('skips the sun marker when the sun is down', () => {
    const midnight = new Date(2026, 5, 21, 0, 0);
    const operations = drawAt(midnight, {
      pose: { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
    });
    expect(operations.some((operation) => operation.name === 'arc')).toBe(
      false
    );
  });

  it('draws nothing for a zero-size viewport', () => {
    const operations = drawAt(NOON, { viewport: { width: 0, height: 0 } });
    expect(operations.some((operation) => operation.name === 'stroke')).toBe(
      false
    );
    expect(operations.some((operation) => operation.name === 'fillText')).toBe(
      false
    );
    expect(operations.some((operation) => operation.name === 'arc')).toBe(
      false
    );
  });
});
