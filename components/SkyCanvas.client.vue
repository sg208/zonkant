<script setup lang="ts">
import { applyOffsets } from '~/utils/skyCalibration';
import {
  accessStatusKey,
  canRetryAccess,
  combineAccessStatus,
  isSensorBlocked,
  showsStartButton as shouldShowStartButton,
} from '~/utils/skyAccess';
import { buildArcs, drawSkyOverlay } from '~/utils/skyDraw';
import { DEFAULT_FOV_DEG } from '~/utils/skyProjection';
import { readSun } from '~/utils/sun';

// Frames only ever go to the <video> element on this page; the canvas holds lines.
const props = defineProps<{
  lat: number;
  lon: number;
  // YYYY-MM-DD, the day of the selected arc
  date: string;
}>();

const MINUTE_MS = 60_000;

const { t } = useI18n();
const orientation = useDeviceOrientation();
const camera = useCameraStream();
const { offsets, isCalibrated, handleCalibrate, handleNudge, handleReset } =
  useSkyCalibration(
    orientation.reading,
    () => props.lat,
    () => props.lon
  );

const stageEl = ref<HTMLElement | null>(null);
const sectionEl = ref<HTMLElement | null>(null);
const statusEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const fovDeg = ref(DEFAULT_FOV_DEG);
const now = ref(new Date());

const displayStatus = computed(() =>
  combineAccessStatus(camera.status.value, orientation.status.value)
);
const statusText = computed(() =>
  t(`sky.status.${accessStatusKey(displayStatus.value)}`, {
    start: t('sky.start'),
  })
);
const isCameraOn = computed(() => camera.status.value === 'granted');
const canRetry = computed(() => canRetryAccess(displayStatus.value));
const showsStartButton = computed(() =>
  shouldShowStartButton(displayStatus.value)
);

const arcs = computed(() => buildArcs(props.date, props.lat, props.lon));

const sunIsUpNow = computed(
  () => readSun(now.value, props.lat, props.lon).altitudeDeg > 0
);
const calibrateNote = computed(() => {
  if (!sunIsUpNow.value) return t('sky.controls.belowHorizon');
  return orientation.reading.value ? null : t('sky.controls.waiting');
});

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
  drawSkyOverlay(context, {
    arcs: arcs.value,
    pose: applyOffsets(raw, offsets.value),
    viewport,
    fovDeg: fovDeg.value,
    isCalibrated: isCalibrated.value,
    translate: (key) => t(key),
    lat: props.lat,
    lon: props.lon,
  });
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

const handlePrimaryAction = (): void => {
  if (canRetry.value) {
    handleRetry();
    return;
  }
  handleStart();
};

// Stopping the camera unmounts the stage and SkyControls; focus sitting inside
// them would fall on <body>, so it moves to the status line instead
watch(
  () => orientation.status.value,
  (sensorStatus) => {
    if (!isSensorBlocked(sensorStatus)) return;
    const isFocusInside =
      sectionEl.value?.contains(document.activeElement) ?? false;
    camera.stop();
    if (isFocusInside) focusStatus();
  }
);

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
  <section ref="sectionEl" class="sky-canvas" :data-calibrated="isCalibrated">
    <p ref="statusEl" class="sky-canvas__status" role="status" tabindex="-1">
      {{ statusText }}
    </p>
    <button
      v-if="showsStartButton"
      type="button"
      class="sky-canvas__start"
      @click="handlePrimaryAction"
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
