import type {
  CameraPose,
  ScreenPoint,
  SkyPathPoint,
  Viewport,
} from '~/types/sky';
import { parseDateText } from '~/utils/dateText';
import { hourMarks, sampleSunPath, solsticeDays } from '~/utils/skyPath';
import { projectPath, projectSkyPoint } from '~/utils/skyProjection';
import { readSun } from '~/utils/sun';

export interface ArcStyle {
  id: 'selected' | 'june' | 'december';
  path: SkyPathPoint[];
  labelKey: string;
  width: number;
  colour: string;
  dash: number[];
  cap: CanvasLineCap;
  // The selected arc turns solid once the compass is calibrated
  uncalibratedDash?: number[];
}

export interface SkyOverlayOptions {
  arcs: ArcStyle[];
  pose: CameraPose;
  viewport: Viewport;
  fovDeg: number;
  isCalibrated: boolean;
  translate: (key: string) => string;
  lat: number;
  lon: number;
}

const SUN_NOW_COLOUR = 'rgb(255, 212, 0)';
const OUTLINE_COLOUR = 'rgba(20, 24, 28, 0.9)';
const MARKER_RADIUS = 9;

// date is YYYY-MM-DD, the day of the selected arc
export const buildArcs = (
  date: string,
  lat: number,
  lon: number
): ArcStyle[] => {
  const selectedDay = parseDateText(date);
  const solstices = solsticeDays(selectedDay.getFullYear());
  const sampleUp = (when: Date): SkyPathPoint[] =>
    sampleSunPath(when, lat, lon).filter(({ altitudeDeg }) => altitudeDeg >= 0);
  return [
    {
      id: 'selected',
      path: sampleUp(selectedDay),
      labelKey: 'sky.canvas.selected',
      width: 4,
      colour: '#ffffff',
      dash: [],
      cap: 'butt',
      uncalibratedDash: [8, 8],
    },
    {
      id: 'june',
      path: sampleUp(solstices.june),
      labelKey: 'sky.canvas.june',
      width: 2,
      colour: '#9fe3ff',
      dash: [18, 8],
      cap: 'butt',
    },
    {
      id: 'december',
      path: sampleUp(solstices.december),
      labelKey: 'sky.canvas.december',
      width: 2,
      colour: '#ffb3c7',
      dash: [2, 8],
      cap: 'round',
    },
  ];
};

const drawText = (
  context: CanvasRenderingContext2D,
  text: string,
  point: ScreenPoint
): void => {
  context.lineWidth = 3;
  context.strokeStyle = OUTLINE_COLOUR;
  context.strokeText(text, point.x, point.y);
  context.fillStyle = '#ffffff';
  context.fillText(text, point.x, point.y);
};

const strokeSegments = (
  context: CanvasRenderingContext2D,
  segments: ScreenPoint[][],
  arc: ArcStyle,
  isCalibrated: boolean
): void => {
  const dash = isCalibrated ? arc.dash : (arc.uncalibratedDash ?? arc.dash);
  context.setLineDash(dash);
  context.lineCap = arc.cap;
  for (const [colour, extra] of [
    [OUTLINE_COLOUR, 3],
    [arc.colour, 0],
  ] as const) {
    context.strokeStyle = colour;
    context.lineWidth = arc.width + extra;
    for (const segment of segments) {
      context.beginPath();
      segment.forEach((point, index) =>
        index === 0
          ? context.moveTo(point.x, point.y)
          : context.lineTo(point.x, point.y)
      );
      context.stroke();
    }
  }
  context.setLineDash([]);
};

const drawArcLabel = (
  context: CanvasRenderingContext2D,
  label: string,
  segments: ScreenPoint[][]
): void => {
  let highest: ScreenPoint | null = null;
  for (const point of segments.flat()) {
    if (highest === null || point.y < highest.y) highest = point;
  }
  if (highest) {
    drawText(context, label, { x: highest.x, y: highest.y - 12 });
  }
};

const drawHourMarks = (
  context: CanvasRenderingContext2D,
  arc: ArcStyle,
  pose: CameraPose,
  viewport: Viewport,
  fovDeg: number
): void => {
  for (const hour of hourMarks(arc.path)) {
    const point = projectSkyPoint(hour, pose, viewport, fovDeg);
    if (!point) continue;
    context.fillStyle = arc.colour;
    context.fillRect(point.x - 3, point.y - 3, 6, 6);
    drawText(context, String(hour.time.getHours()), {
      x: point.x,
      y: point.y + 18,
    });
  }
};

const drawSunNow = (
  context: CanvasRenderingContext2D,
  options: SkyOverlayOptions
): void => {
  const sun = readSun(new Date(), options.lat, options.lon);
  if (sun.altitudeDeg <= 0) return;
  const point = projectSkyPoint(
    { azimuthDeg: sun.bearingDeg, altitudeDeg: sun.altitudeDeg },
    options.pose,
    options.viewport,
    options.fovDeg
  );
  if (!point) return;
  context.beginPath();
  context.arc(point.x, point.y, MARKER_RADIUS, 0, Math.PI * 2);
  context.fillStyle = SUN_NOW_COLOUR;
  context.fill();
  context.beginPath();
  context.arc(point.x, point.y, MARKER_RADIUS + 1.5, 0, Math.PI * 2);
  context.lineWidth = 3;
  context.strokeStyle = OUTLINE_COLOUR;
  context.stroke();
};

export const drawSkyOverlay = (
  context: CanvasRenderingContext2D,
  options: SkyOverlayOptions
): void => {
  const { arcs, pose, viewport, fovDeg, isCalibrated, translate } = options;
  for (const arc of arcs) {
    const segments = projectPath(arc.path, pose, viewport, fovDeg);
    strokeSegments(context, segments, arc, isCalibrated);
    drawArcLabel(context, translate(arc.labelKey), segments);
    if (arc.id === 'selected') {
      drawHourMarks(context, arc, pose, viewport, fovDeg);
    }
  }
  drawSunNow(context, options);
};
