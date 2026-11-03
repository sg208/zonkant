import { describe, expect, it } from 'vitest';
import { bearingVector, lineCoords } from '~/utils/sunLines';

// Behavior protected: compass bearing (clockwise from north) maps to EPSG:3857 axes.
// Regression: swapped sin/cos or a flipped y axis would mirror every sun line.
// Why uncaught elsewhere: nothing else checks map geometry.
describe('bearingVector', () => {
  it.each([
    [0, 0, 1],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
  ])('bearing %i points to (%d, %d)', (bearing, dx, dy) => {
    const vector = bearingVector(bearing);
    expect(vector.dx).toBeCloseTo(dx, 10);
    expect(vector.dy).toBeCloseTo(dy, 10);
  });
});

describe('lineCoords', () => {
  it('starts at the centre and is pixels x resolution long', () => {
    const [start, end] = lineCoords([1000, 2000], 90, 300, 2);
    expect(start).toEqual([1000, 2000]);
    expect(end[0]).toBeCloseTo(1600, 6);
    expect(end[1]).toBeCloseTo(2000, 6);
  });

  it('runs north for bearing 0 and keeps length on a diagonal bearing', () => {
    const [, north] = lineCoords([0, 0], 0, 100, 5);
    expect(north[0]).toBeCloseTo(0, 6);
    expect(north[1]).toBeCloseTo(500, 6);

    const [, diagonal] = lineCoords([0, 0], 45, 100, 5);
    expect(Math.hypot(diagonal[0], diagonal[1])).toBeCloseTo(500, 6);
    expect(diagonal[0]).toBeGreaterThan(0);
    expect(diagonal[1]).toBeGreaterThan(0);
  });
});
