import type {
  CameraPose,
  ScreenPoint,
  SkyDirection,
  Viewport,
} from '~/types/sky';

export const DEFAULT_FOV_DEG = 63;
const DEGREES_TO_RADIANS = Math.PI / 180;

const toRadians = (degrees: number): number => degrees * DEGREES_TO_RADIANS;

// Pinhole camera. East/north/up unit vector -> camera axes (right, up, forward)
// -> perspective divide. Rotating the vector, not subtracting angles, keeps the
// wrap at north and the sky's curvature right.
export const projectSkyPoint = (
  target: SkyDirection,
  pose: CameraPose,
  viewport: Viewport,
  fovDeg = DEFAULT_FOV_DEG
): ScreenPoint | null => {
  const longerSide = Math.max(viewport.width, viewport.height);
  if (longerSide <= 0) return null;

  const azimuth = toRadians(target.azimuthDeg);
  const altitude = toRadians(target.altitudeDeg);
  const east = Math.sin(azimuth) * Math.cos(altitude);
  const north = Math.cos(azimuth) * Math.cos(altitude);
  const up = Math.sin(altitude);

  const heading = toRadians(pose.headingDeg);
  const pitch = toRadians(pose.pitchDeg);
  const forward =
    east * Math.sin(heading) * Math.cos(pitch) +
    north * Math.cos(heading) * Math.cos(pitch) +
    up * Math.sin(pitch);
  if (forward <= 0) return null;

  const right = east * Math.cos(heading) - north * Math.sin(heading);
  const above =
    -east * Math.sin(heading) * Math.sin(pitch) -
    north * Math.cos(heading) * Math.sin(pitch) +
    up * Math.cos(pitch);

  // Rolling the device clockwise turns the scene counter-clockwise on screen
  const roll = toRadians(pose.rollDeg);
  const rolledRight = right * Math.cos(roll) - above * Math.sin(roll);
  const rolledAbove = right * Math.sin(roll) + above * Math.cos(roll);

  const focalPx = longerSide / 2 / Math.tan(toRadians(fovDeg) / 2);
  return {
    x: viewport.width / 2 + (focalPx * rolledRight) / forward,
    y: viewport.height / 2 - (focalPx * rolledAbove) / forward,
  };
};

// Visible runs only: a point behind the camera ends the current run
export const projectPath = (
  path: SkyDirection[],
  pose: CameraPose,
  viewport: Viewport,
  fovDeg = DEFAULT_FOV_DEG
): ScreenPoint[][] => {
  const segments: ScreenPoint[][] = [];
  let currentSegment: ScreenPoint[] = [];
  for (const direction of path) {
    const point = projectSkyPoint(direction, pose, viewport, fovDeg);
    if (point) {
      currentSegment.push(point);
      continue;
    }
    if (currentSegment.length > 1) segments.push(currentSegment);
    currentSegment = [];
  }
  if (currentSegment.length > 1) segments.push(currentSegment);
  return segments;
};
