// Wraps any angle, negative or multi-turn, into [0, 360)
export const wrapDegrees = (degrees: number): number =>
  ((degrees % 360) + 360) % 360;
