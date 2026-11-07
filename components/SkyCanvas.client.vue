<script setup lang="ts">
import type {
  CalibrationOffsets,
  ScreenPoint,
  SkyAccessStatus,
  SkyPathPoint,
} from '~/types/sky';
import {
  applyOffsets,
  calibrateToCurrentSun,
  nudge,
  resetCalibration,
} from '~/utils/skyCalibration';
import { sampleSunPath, solsticeDays } from '~/utils/skyPath';
import { projectPath, projectSkyPoint } from '~/utils/skyProjection';
import { readSun } from '~/utils/sun';

// Frames only ever go to the <video> element on this page; the canvas holds lines.
const props = defineProps<{
  lat: number;
  lon: number;
  // YYYY-MM-DD, the day of the selected arc
  date: string;
}>();

interface ArcStyle {
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

const DEFAULT_FOV_DEG = 63;
const SUN_NOW_COLOUR = 'rgb(255, 212, 0)';
const OUTLINE_COLOUR = 'rgba(20, 24, 28, 0.9)';
const MARKER_RADIUS = 9;
const MINUTE_MS = 60_000;

const { t } = useI18n();
const orientation = useDeviceOrientation();
const camera = useCameraStream();

const stageEl = ref<HTMLElement | null>(null);
const statusEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const offsets = ref<CalibrationOffsets>(resetCalibration());
const isCalibrated = ref(false);
const fovDeg = ref(DEFAULT_FOV_DEG);
const now = ref(new Date());

const displayStatus = computed<SkyAccessStatus>(() => {
  const cameraStatus = camera.status.value;
  const sensorStatus = orientation.status.value;
  for (const terminal of [
    'denied',
    'insecure',
    'unsupported',
    'busy',
  ] as const) {
    if (cameraStatus === terminal || sensorStatus === terminal) return terminal;
  }
  if (sensorStatus === 'no-sensor') return 'no-sensor';
  if (cameraStatus === 'requesting' || sensorStatus === 'requesting')
    return 'requesting';
  if (cameraStatus === 'granted' && sensorStatus === 'granted')
    return 'granted';
  // Camera is on and the first compass reading has not arrived yet
  return cameraStatus === 'granted' ? 'requesting' : 'idle';
});
const STATUS_KEYS: Record<SkyAccessStatus, string> = {
  idle: 'idle',
  requesting: 'requesting',
  granted: 'ready',
  denied: 'denied',
  busy: 'busy',
  unsupported: 'unsupported',
  insecure: 'insecure',
  'no-sensor': 'noSensor',
};
const statusText = computed(() =>
  t(`sky.status.${STATUS_KEYS[displayStatus.value]}`, {
    start: t('sky.start'),
  })
);
const isCameraOn = computed(() => camera.status.value === 'granted');
const canRetry = computed(() =>
  ['denied', 'no-sensor', 'busy'].includes(displayStatus.value)
);
const showsStartButton = computed(
  () => displayStatus.value === 'idle' || canRetry.value
);

const arcs = computed<ArcStyle[]>(() => {
  const [year = 0, month = 1, day = 1] = props.date.split('-').map(Number);
  const solstices = solsticeDays(year);
  const sampleUp = (when: Date): SkyPathPoint[] =>
    sampleSunPath(when, props.lat, props.lon).filter(
      ({ altitudeDeg }) => altitudeDeg >= 0
    );
  return [
    {
      id: 'selected',
      path: sampleUp(new Date(year, month - 1, day)),
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
});

const sunIsUpNow = computed(
  () => readSun(now.value, props.lat, props.lon).altitudeDeg > 0
);
const calibrateNote = computed(() => {
  if (!sunIsUpNow.value) return t('sky.controls.belowHorizon');
  return orientation.reading.value ? null : t('sky.controls.waiting');
});

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
  arc: ArcStyle
): void => {
  const dash = isCalibrated.value
    ? arc.dash
    : (arc.uncalibratedDash ?? arc.dash);
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

const drawArcLabels = (
  context: CanvasRenderingContext2D,
  arc: ArcStyle,
  segments: ScreenPoint[][]
): void => {
  let highest: ScreenPoint | null = null;
  for (const point of segments.flat()) {
    if (highest === null || point.y < highest.y) highest = point;
  }
  if (highest) {
    drawText(context, t(arc.labelKey), { x: highest.x, y: highest.y - 12 });
  }
};

const drawHourMarks = (
  context: CanvasRenderingContext2D,
  arc: ArcStyle,
  pose: ReturnType<typeof applyOffsets>,
  viewport: { width: number; height: number }
): void => {
  const hours = arc.path.filter(
    ({ time }) => time.getMinutes() === 0 && time.getSeconds() === 0
  );
  for (const hour of hours) {
    const point = projectSkyPoint(hour, pose, viewport, fovDeg.value);
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
  pose: ReturnType<typeof applyOffsets>,
  viewport: { width: number; height: number }
): void => {
  const sun = readSun(new Date(), props.lat, props.lon);
  if (sun.altitudeDeg <= 0) return;
  const point = projectSkyPoint(
    { azimuthDeg: sun.bearingDeg, altitudeDeg: sun.altitudeDeg },
    pose,
    viewport,
    fovDeg.value
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

const draw = (): void => {
  const stage = stageEl.value;
  const canvas = canvasEl.value;
  const context = canvas?.getContext('2d');
  if (!stage || !canvas || !context) return;
  const viewport = { width: stage.clientWidth, height: stage.clientHeight };
  const pixelRatio = window.devicePixelRatio || 1;
  // Assigning width also clears the canvas
  canvas.width = Math.round(viewport.width * pixelRatio);
  canvas.height = Math.round(viewport.height * pixelRatio);
  const raw = orientation.reading.value;
  if (!raw) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.font = '700 14px system-ui, sans-serif';
  context.textAlign = 'center';
  const pose = applyOffsets(raw, offsets.value);
  for (const arc of arcs.value) {
    const segments = projectPath(arc.path, pose, viewport, fovDeg.value);
    strokeSegments(context, segments, arc);
    drawArcLabels(context, arc, segments);
    if (arc.id === 'selected') drawHourMarks(context, arc, pose, viewport);
  }
  drawSunNow(context, pose, viewport);
};

let frameId = 0;
const scheduleDraw = (): void => {
  if (frameId !== 0) return;
  frameId = requestAnimationFrame(() => {
    frameId = 0;
    draw();
  });
};

watch(
  [orientation.reading, offsets, isCalibrated, fovDeg, arcs, canvasEl],
  scheduleDraw,
  { flush: 'post' }
);
watch(
  [camera.stream, videoEl],
  ([stream, video]) => {
    if (video) video.srcObject = stream;
  },
  { flush: 'post' }
);

// A blocked sensor leaves the camera streaming with nothing to draw on it
watch(
  () => orientation.status.value,
  (sensorStatus) => {
    if (sensorStatus === 'denied' || sensorStatus === 'no-sensor') {
      camera.stop();
    }
  }
);

// The Start/Retry button unmounts the moment the status changes, which drops
// focus on <body>; hand it to the status line, the element that replaces it
const focusStatus = (): void => {
  void nextTick(() => statusEl.value?.focus());
};

const handleStart = (): void => {
  // Both calls run inside the tap: iOS only shows its sensor prompt there
  void orientation.start();
  void camera.start();
  focusStatus();
};

const handleRetry = (): void => {
  orientation.stop();
  camera.stop();
  handleStart();
};

const handleCalibrate = (): void => {
  const raw = orientation.reading.value;
  if (!raw) return;
  const result = calibrateToCurrentSun(raw, props.lat, props.lon);
  if (!result.ok) return;
  offsets.value = result.offsets;
  isCalibrated.value = true;
};

const handleNudge = (step: 1 | -1): void => {
  offsets.value = {
    ...offsets.value,
    headingOffsetDeg: nudge(offsets.value.headingOffsetDeg, step),
  };
};

const handleReset = (): void => {
  offsets.value = resetCalibration();
  isCalibrated.value = false;
};

let resizeObserver: ResizeObserver | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;
watch(stageEl, (stage) => {
  resizeObserver?.disconnect();
  if (stage && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleDraw);
    resizeObserver.observe(stage);
  }
});

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date();
  }, MINUTE_MS);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId);
  resizeObserver?.disconnect();
  clearInterval(clockTimer);
});
</script>

<template>
  <section class="sky-canvas" :data-calibrated="isCalibrated">
    <p ref="statusEl" class="sky-canvas__status" role="status" tabindex="-1">
      {{ statusText }}
    </p>
    <button
      v-if="showsStartButton"
      type="button"
      class="sky-canvas__start"
      @click="canRetry ? handleRetry() : handleStart()"
    >
      {{ canRetry ? t('sky.retry') : t('sky.start') }}
    </button>

    <div
      v-if="isCameraOn"
      ref="stageEl"
      class="sky-canvas__stage"
      role="img"
      :aria-label="t('sky.stageLabel')"
    >
      <video
        ref="videoEl"
        class="sky-canvas__layer sky-canvas__video"
        playsinline
        muted
        autoplay
        aria-hidden="true"
        tabindex="-1"
      />
      <canvas
        ref="canvasEl"
        class="sky-canvas__layer"
        aria-hidden="true"
      ></canvas>
      <span class="sky-canvas__crosshair" aria-hidden="true"></span>
    </div>

    <SkyControls
      v-if="isCameraOn"
      v-model:fov-deg="fovDeg"
      :is-calibrated="isCalibrated"
      :can-calibrate="calibrateNote === null"
      :calibrate-note="calibrateNote"
      :heading-offset-deg="offsets.headingOffsetDeg"
      @calibrate="handleCalibrate"
      @nudge="handleNudge"
      @reset="handleReset"
    />
  </section>
</template>

<style scoped>
.sky-canvas {
  display: grid;
  gap: var(--space-3);
}
.sky-canvas__status {
  max-width: 65ch;
  padding: var(--space-3);
  border: 2px solid var(--ink);
}
.sky-canvas__start {
  justify-self: start;
  padding: 0 var(--space-4);
  border: 2px solid var(--ink);
  background: var(--ink);
  color: var(--ground);
  font-weight: 800;
  cursor: pointer;
}
.sky-canvas__stage {
  position: relative;
  height: min(60dvh, 36rem);
  overflow: hidden;
  background: var(--ink);
}
.sky-canvas__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.sky-canvas__video {
  object-fit: cover;
}
.sky-canvas__crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  pointer-events: none;
}
.sky-canvas__crosshair::before,
.sky-canvas__crosshair::after {
  content: '';
  position: absolute;
  background: #fff;
  outline: 1px solid var(--ink);
}
.sky-canvas__crosshair::before {
  top: 0;
  bottom: 0;
  left: 19px;
  width: 2px;
}
.sky-canvas__crosshair::after {
  left: 0;
  right: 0;
  top: 19px;
  height: 2px;
}
</style>
