import { describe, expect, it } from 'vitest';
import { projectPath, projectSkyPoint } from '~/utils/skyProjection';
import type { CameraPose, ScreenPoint } from '~/types/sky';

const VIEWPORT = { width: 400, height: 800 };
const FACING_NORTH: CameraPose = { headingDeg: 0, pitchDeg: 0, rollDeg: 0 };

const project = (
  azimuthDeg: number,
  altitudeDeg: number,
  pose: CameraPose = FACING_NORTH
): ScreenPoint => {
  const point = projectSkyPoint({ azimuthDeg, altitudeDeg }, pose, VIEWPORT);
  if (!point) throw new Error('expected a visible point');
  return point;
};

describe('projectSkyPoint', () => {
  it('puts a target straight ahead at the screen centre', () => {
    const point = project(0, 0);
    expect(point.x).toBeCloseTo(200, 5);
    expect(point.y).toBeCloseTo(400, 5);
  });

  it('puts a target 10 degrees to the right right of centre', () => {
    const point = project(10, 0);
    expect(point.x).toBeGreaterThan(200);
    expect(point.y).toBeCloseTo(400, 5);
  });

  it('puts a target above the horizon above centre (smaller y)', () => {
    expect(project(0, 10).y).toBeLessThan(400);
  });

  it('spans the configured field of view across the longer side', () => {
    // 63 degrees over 800 px: a target half the fov up lands on the top edge
    const point = project(0, 31.5);
    expect(point.y).toBeCloseTo(0, 3);
  });

  it('wraps across north: heading 359 and azimuth 1 is 2 degrees right, not -358', () => {
    const wrapped = project(1, 0, { ...FACING_NORTH, headingDeg: 359 });
    const direct = project(2, 0);
    expect(wrapped.x).toBeCloseTo(direct.x, 5);
    expect(wrapped.x).toBeGreaterThan(200);
  });

  it('returns null for a target behind the camera', () => {
    const behind = projectSkyPoint(
      { azimuthDeg: 180, altitudeDeg: 0 },
      FACING_NORTH,
      VIEWPORT
    );
    expect(behind).toBeNull();
  });

  it('follows the pitch: looking up 45 degrees puts a 45 degree sun at centre', () => {
    const point = project(0, 45, { ...FACING_NORTH, pitchDeg: 45 });
    expect(point.x).toBeCloseTo(200, 5);
    expect(point.y).toBeCloseTo(400, 5);
  });

  it('swaps axes when rolled 90 degrees', () => {
    const rolled = project(10, 0, { ...FACING_NORTH, rollDeg: 90 });
    expect(rolled.x).toBeCloseTo(200, 5);
    expect(rolled.y).toBeLessThan(400);
  });

  it('returns null for a zero-size viewport', () => {
    const point = projectSkyPoint(
      { azimuthDeg: 0, altitudeDeg: 0 },
      FACING_NORTH,
      { width: 0, height: 0 }
    );
    expect(point).toBeNull();
  });
});

describe('projectPath', () => {
  const pathPoint = (
    azimuthDeg: number
  ): {
    time: Date;
    azimuthDeg: number;
    altitudeDeg: number;
  } => ({ time: new Date(0), azimuthDeg, altitudeDeg: 0 });

  it('splits the polyline where points go behind the camera', () => {
    const path = [0, 10, 180, 350, 5, 15].map(pathPoint);
    const segments = projectPath(path, FACING_NORTH, VIEWPORT);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toHaveLength(2);
    expect(segments[1]).toHaveLength(3);
  });

  it('returns one segment when everything is visible and none when all is behind', () => {
    const ahead = [0, 5, 10].map(pathPoint);
    const behind = [170, 180, 190].map(pathPoint);
    expect(projectPath(ahead, FACING_NORTH, VIEWPORT)).toHaveLength(1);
    expect(projectPath(behind, FACING_NORTH, VIEWPORT)).toEqual([]);
  });
});
