import { describe, expect, it } from 'vitest';
import { wrapDegrees } from '~/utils/angles';

// Behaviour protected: one 0-360 wrap shared by sun, compass and orientation maths.
// Turns red if: negative or multi-turn input stops landing in [0, 360).
describe('wrapDegrees', () => {
  it.each([
    [-90, 270],
    [0, 0],
    [360, 0],
    [725, 5],
    [359.9, 359.9],
  ])('wraps %s to %s', (input, expected) => {
    expect(wrapDegrees(input)).toBeCloseTo(expected, 9);
  });
});
