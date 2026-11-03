export type MapCoordinate = [number, number];

// Compass bearing (degrees clockwise from north) as a unit vector in EPSG:3857
// axes: x grows east, y grows north.
export const bearingVector = (
  bearingDeg: number
): { dx: number; dy: number } => {
  const radians = (bearingDeg * Math.PI) / 180;
  return { dx: Math.sin(radians), dy: Math.cos(radians) };
};

// A ray from `center` along `bearingDeg`, `pixels` long on screen
// (`resolution` = map units per pixel).
export const lineCoords = (
  center: MapCoordinate,
  bearingDeg: number,
  pixels: number,
  resolution: number
): [MapCoordinate, MapCoordinate] => {
  const { dx, dy } = bearingVector(bearingDeg);
  const length = pixels * resolution;
  return [center, [center[0] + dx * length, center[1] + dy * length]];
};
