export interface SkyPathPoint {
  time: Date;
  // 0-360 clockwise from north
  azimuthDeg: number;
  altitudeDeg: number;
}

// Direction in the sky: azimuth clockwise from north, altitude above the horizon
export interface SkyDirection {
  azimuthDeg: number;
  altitudeDeg: number;
}

// Where the rear camera points: heading clockwise from north, pitch above the
// horizon (negative = down), roll clockwise about the viewing axis
export interface CameraPose {
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
}

export interface Viewport {
  width: number;
  height: number;
}

// Pixels from the top-left corner of the viewport
export interface ScreenPoint {
  x: number;
  y: number;
}

// The slice of DeviceOrientationEvent the sky view reads; iOS adds
// webkitCompassHeading (degrees clockwise from magnetic north)
export interface OrientationInput {
  type?: string;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute?: boolean;
  webkitCompassHeading?: number;
}

export interface OrientationReading extends CameraPose {
  // True when heading is relative to an arbitrary start, not to north
  isRelative: boolean;
}

// Shared by the orientation sensor and the camera. UI maps each code to text.
export type SkyAccessStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure'
  | 'no-sensor';

// Added to the raw sensor pose so the centre crosshair lands on the sun
export interface CalibrationOffsets {
  headingOffsetDeg: number;
  pitchOffsetDeg: number;
}

export type CalibrationResult =
  | { ok: true; offsets: CalibrationOffsets }
  | { ok: false; error: 'sun-below-horizon' };
