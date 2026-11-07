import type { OrientationInput, OrientationReading } from '~/types/sky';

type Vector = [east: number, north: number, up: number];

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
// Below this horizontal length the camera points (almost) straight up or down
const DEGENERATE_HORIZONTAL_LENGTH = 1e-3;

const toRadians = (degrees: number): number => degrees * DEGREES_TO_RADIANS;

const wrapDegrees = (degrees: number): number => ((degrees % 360) + 360) % 360;

// W3C device frame -> Earth frame (east, north, up): Rz(alpha) * Rx(beta) * Ry(gamma)
const deviceToEarth = (
  vector: Vector,
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number
): Vector => {
  const [x, y, z] = vector;
  const gamma = toRadians(gammaDeg);
  const afterGammaX = x * Math.cos(gamma) + z * Math.sin(gamma);
  const afterGammaZ = -x * Math.sin(gamma) + z * Math.cos(gamma);
  const beta = toRadians(betaDeg);
  const afterBetaY = y * Math.cos(beta) - afterGammaZ * Math.sin(beta);
  const afterBetaZ = y * Math.sin(beta) + afterGammaZ * Math.cos(beta);
  const alpha = toRadians(alphaDeg);
  return [
    afterGammaX * Math.cos(alpha) - afterBetaY * Math.sin(alpha),
    afterGammaX * Math.sin(alpha) + afterBetaY * Math.cos(alpha),
    afterBetaZ,
  ];
};

const horizontalHeadingDeg = ([east, north]: Vector): number =>
  wrapDegrees(Math.atan2(east, north) * RADIANS_TO_DEGREES);

const isAbsoluteSource = (input: OrientationInput): boolean =>
  input.absolute === true || input.type === 'deviceorientationabsolute';

// Roll = angle of the screen's up edge from the horizon-level "up" for this view
// direction, positive clockwise as seen by the viewer.
const rollDeg = (forward: Vector, screenUp: Vector): number => {
  const [east, north, up] = forward;
  // right = forward x worldUp
  const right: Vector = [north, -east, 0];
  const rightLength = Math.hypot(right[0], right[1]);
  const levelUp: Vector = [
    -east * up,
    -north * up,
    east * east + north * north,
  ];
  const levelUpLength = Math.hypot(...levelUp);
  const rightPart =
    (screenUp[0] * right[0] + screenUp[1] * right[1]) / rightLength;
  const upPart =
    (screenUp[0] * levelUp[0] +
      screenUp[1] * levelUp[1] +
      screenUp[2] * levelUp[2]) /
    levelUpLength;
  return Math.atan2(rightPart, upPart) * RADIANS_TO_DEGREES;
};

// Describes the rear camera axis, which is the device's -z axis. The screen angle
// only decides which device edge is "up" on screen: it sets the roll, and the
// heading of a flat device (camera straight down) where the axis has no heading.
export const normaliseOrientation = (
  input: OrientationInput,
  screenAngleDeg: number
): OrientationReading | null => {
  const { beta, gamma } = input;
  if (beta === null || gamma === null) return null;
  const hasCompassHeading = typeof input.webkitCompassHeading === 'number';
  if (input.alpha === null && !hasCompassHeading) return null;
  const alpha = input.alpha ?? 0;

  const forward = deviceToEarth([0, 0, -1], alpha, beta, gamma);
  const screenAngle = toRadians(screenAngleDeg);
  const screenUp = deviceToEarth(
    [Math.sin(screenAngle), Math.cos(screenAngle), 0],
    alpha,
    beta,
    gamma
  );
  const pitchDeg =
    Math.asin(Math.max(-1, Math.min(1, forward[2]))) * RADIANS_TO_DEGREES;
  const isLookingStraightVertical =
    Math.hypot(forward[0], forward[1]) < DEGENERATE_HORIZONTAL_LENGTH;

  const isAbsolute = isAbsoluteSource(input);
  const headingFromEvent = isLookingStraightVertical
    ? horizontalHeadingDeg(screenUp)
    : horizontalHeadingDeg(forward);

  return {
    headingDeg: hasCompassHeading
      ? wrapDegrees(input.webkitCompassHeading as number)
      : headingFromEvent,
    pitchDeg,
    rollDeg: isLookingStraightVertical ? 0 : rollDeg(forward, screenUp),
    isRelative: !hasCompassHeading && !isAbsolute,
  };
};
