<script setup lang="ts">
import 'ol/ol.css';
import type { Feature } from 'ol';
import type { Coordinate } from 'ol/coordinate';
import type OlMap from 'ol/Map';
import type Overlay from 'ol/Overlay';
import type { Style as OlStyle } from 'ol/style';
import type VectorSource from 'ol/source/Vector';
import type View from 'ol/View';
import { PALETTE } from '~/utils/palette';
import { lineCoords } from '~/utils/sunLines';
import type { LatLon, MapBearings } from '~/types/sun';

// Placement of the selected point above the parent's bottom sheet: `bottomInset`
// (px) becomes `View.padding` bottom (ol/View.js `padding`, "Padding (in css
// pixels)"). The view centre then sits in the uncovered part of the map, so
// centring on the point keeps it visible above the sheet.
const props = withDefaults(
  defineProps<{
    point: LatLon;
    bearings: MapBearings;
    bottomInset?: number;
  }>(),
  { bottomInset: 0 }
);

const emit = defineEmits<{ select: [point: LatLon] }>();

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const INITIAL_ZOOM = 12;
const RECENTRE_MS = 200;
const COORDINATE_EPSILON = 1e-9;

type LineKind = keyof MapBearings;

const LINES: { kind: LineKind; label: string; dash: number[] }[] = [
  { kind: 'sunrise', label: 'Sunrise', dash: [10, 6] },
  { kind: 'sunset', label: 'Sunset', dash: [2, 6] },
  { kind: 'sun', label: 'Sun now', dash: [] },
  { kind: 'shadow', label: 'Shadow', dash: [14, 4, 2, 4] },
];
const COLOR: Record<LineKind, string> = {
  sunrise: PALETTE['line-sunrise'],
  sunset: PALETTE['line-sunset'],
  sun: PALETTE['line-sun'],
  shadow: PALETTE['line-shadow'],
};

const mapElement = ref<HTMLElement | null>(null);
const markerElement = ref<HTMLElement | null>(null);
const hasTileError = ref(false);
const visibleLines = computed(() =>
  LINES.filter((line) => props.bearings[line.kind] !== null)
);

let map: OlMap | undefined;
let view: View | undefined;
let marker: Overlay | undefined;
let source: VectorSource | undefined;
let toCenter: ((point: LatLon) => Coordinate) | undefined;
let createFeature:
  ((kind: LineKind, coords: Coordinate[]) => Feature) | undefined;
let isUnmounted = false;
// The last point the user picked by clicking. The parent echoes it back as
// `point`; recentring on that echo would make the map jump under the finger.
let clickedPoint: LatLon | undefined;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const isSamePoint = (a: LatLon, b: LatLon): boolean =>
  Math.abs(a.lat - b.lat) < COORDINATE_EPSILON &&
  Math.abs(a.lon - b.lon) < COORDINATE_EPSILON;

// OL shows "+" / "-" glyphs; pair each with a visible-to-AT name
const buttonLabel = (glyph: string, name: string): HTMLElement => {
  const label = document.createElement('span');
  const glyphElement = document.createElement('span');
  glyphElement.setAttribute('aria-hidden', 'true');
  glyphElement.textContent = glyph;
  const nameElement = document.createElement('span');
  nameElement.className = 'sun-map__note';
  nameElement.textContent = name;
  label.append(glyphElement, nameElement);
  return label;
};

const redrawLines = (): void => {
  if (!map || !view || !source || !toCenter || !createFeature) return;
  const size = map.getSize();
  const resolution = view.getResolution();
  source.clear();
  if (!size || resolution === undefined) return;
  // Twice the diagonal: the ray still leaves the screen when the point is panned off-centre
  const pixels = Math.hypot(size[0]!, size[1]!) * 2;
  const center = toCenter(props.point) as [number, number];
  const features = LINES.flatMap(({ kind }) => {
    const bearing = props.bearings[kind];
    return bearing === null
      ? []
      : [createFeature!(kind, lineCoords(center, bearing, pixels, resolution))];
  });
  source.addFeatures(features);
};

const centreOnPoint = (isAnimated: boolean): void => {
  if (!view || !toCenter) return;
  const center = toCenter(props.point);
  if (isAnimated && !prefersReducedMotion()) {
    view.animate({ center, duration: RECENTRE_MS });
  } else {
    view.setCenter(center);
  }
};

const handleError = (): void => {
  hasTileError.value = true;
};

onMounted(async () => {
  const [
    { default: Map },
    { default: View },
    { default: Overlay },
    { default: LayerGroup },
    { default: VectorLayer },
    { default: VectorSource },
    { default: Feature },
    { LineString },
    { Stroke, Style },
    { defaults: defaultControls },
    { defaults: defaultInteractions },
    { fromLonLat, toLonLat },
    { apply },
  ] = await Promise.all([
    import('ol/Map'),
    import('ol/View'),
    import('ol/Overlay'),
    import('ol/layer/Group'),
    import('ol/layer/Vector'),
    import('ol/source/Vector'),
    import('ol/Feature'),
    import('ol/geom'),
    import('ol/style'),
    import('ol/control/defaults'),
    import('ol/interaction/defaults'),
    import('ol/proj'),
    import('ol-mapbox-style'),
  ]);
  if (isUnmounted || !mapElement.value) return;

  toCenter = (point): Coordinate => fromLonLat([point.lon, point.lat]);
  createFeature = (kind, coords): Feature => {
    const feature = new Feature(new LineString(coords));
    feature.set('kind', kind);
    return feature;
  };

  const styles = Object.fromEntries(
    LINES.map(({ kind, dash }): [LineKind, OlStyle] => [
      kind,
      new Style({
        stroke: new Stroke({
          color: COLOR[kind],
          width: 3,
          lineDash: dash.length > 0 ? dash : undefined,
        }),
      }),
    ])
  );
  source = new VectorSource();
  const lineLayer = new VectorLayer({
    source,
    style: (feature): OlStyle | undefined =>
      styles[feature.get('kind') as LineKind],
  });
  const baseLayers = new LayerGroup();

  view = new View({
    center: toCenter(props.point),
    zoom: INITIAL_ZOOM,
    padding: [0, 0, props.bottomInset, 0],
  });
  marker = new Overlay({
    element: markerElement.value ?? undefined,
    positioning: 'center-center',
    position: toCenter(props.point),
  });

  const zoomDuration = prefersReducedMotion() ? 0 : undefined;
  const controls = defaultControls({
    attribution: false,
    rotate: false,
    zoomOptions: {
      duration: zoomDuration,
      zoomInLabel: buttonLabel('+', 'Zoom in'),
      zoomOutLabel: buttonLabel('\u2212', 'Zoom out'),
    },
  });
  map = new Map({
    target: mapElement.value,
    layers: [baseLayers, lineLayer],
    overlays: [marker],
    view,
    controls,
    interactions: defaultInteractions({ zoomDuration }),
  });

  map.on('moveend', redrawLines);
  map.on('singleclick', (event) => {
    const [lon, lat] = toLonLat(event.coordinate) as [number, number];
    clickedPoint = { lat, lon };
    emit('select', clickedPoint);
  });
  redrawLines();

  try {
    // WHY: without `webfonts`, ol-mapbox-style injects <link>s to cdn.jsdelivr.net
    // for every label font (51 requests), breaking the privacy promise that only
    // tiles.openfreemap.org is contacted. A template with no placeholders resolves
    // to one same-origin stylesheet, so labels use the browser's sans-serif.
    await apply(baseLayers, STYLE_URL, { webfonts: '/map-fonts.css' });
  } catch {
    handleError();
  }
});

watch(
  () => props.bearings,
  () => redrawLines(),
  { deep: true }
);

watch(
  () => props.point,
  (point) => {
    marker?.setPosition(toCenter?.(point));
    redrawLines();
    // A click already put the point where the user tapped; only a change from
    // outside (coordinate inputs, geolocation, URL) moves the view
    if (clickedPoint && isSamePoint(clickedPoint, point)) return;
    centreOnPoint(true);
  }
);

watch(
  () => props.bottomInset,
  (inset) => {
    if (!view) return;
    view.padding = [0, 0, inset, 0];
    centreOnPoint(false);
  }
);

onBeforeUnmount(() => {
  isUnmounted = true;
  map?.un('moveend', redrawLines);
  map?.setTarget(undefined);
  map?.dispose();
  map = undefined;
});
</script>

<template>
  <div class="sun-map" :style="{ '--sheet-inset': `${bottomInset}px` }">
    <div
      ref="mapElement"
      class="sun-map__canvas"
      role="region"
      aria-label="Map"
      tabindex="0"
    ></div>
    <div class="sun-map__marker-host">
      <div
        ref="markerElement"
        class="sun-map__marker"
        role="img"
        aria-label="Selected point"
      ></div>
    </div>
    <p class="sun-map__status" role="status">
      {{ hasTileError ? 'Map tiles could not load' : '' }}
    </p>
    <div class="sun-map__info">
      <ul class="sun-map__legend" aria-label="Map lines">
        <li v-for="line in visibleLines" :key="line.kind">
          <svg width="32" height="8" aria-hidden="true" focusable="false">
            <line
              x1="0"
              y1="4"
              x2="32"
              y2="4"
              :stroke="COLOR[line.kind]"
              stroke-width="3"
              :stroke-dasharray="line.dash.join(' ') || undefined"
            />
          </svg>
          {{ line.label }}
        </li>
      </ul>
      <p class="sun-map__attribution">
        <a
          href="https://openfreemap.org"
          target="_blank"
          rel="noopener noreferrer"
          >OpenFreeMap<span class="sun-map__note">
            (opens in a new tab)</span
          ></a
        >
        <a
          href="https://www.openmaptiles.org/"
          target="_blank"
          rel="noopener noreferrer"
          >© OpenMapTiles<span class="sun-map__note">
            (opens in a new tab)</span
          ></a
        >
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          >Data from OpenStreetMap<span class="sun-map__note">
            (opens in a new tab)</span
          ></a
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.sun-map {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--map-ground);
}

.sun-map__canvas {
  position: absolute;
  inset: 0;
}

.sun-map__marker-host {
  display: none;
}

.sun-map__marker {
  width: 22px;
  height: 22px;
  background: var(--accent);
  border: 3px solid var(--ink);
}

.sun-map__status {
  position: absolute;
  top: calc(var(--safe-top) + var(--space-3));
  left: var(--margin);
  margin: 0;
  font-size: var(--text-small);
  background: var(--ground);
  color: var(--ink);
}

.sun-map__status:not(:empty) {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--ink);
}

/* Sits above the bottom sheet so attribution stays readable */
.sun-map__info {
  position: absolute;
  left: var(--margin);
  right: var(--margin);
  bottom: calc(var(--sheet-inset) + var(--space-2));
  font-size: var(--text-small);
  color: var(--ink);
  pointer-events: none;
}

@media (min-width: 768px) {
  /* Clear of the 24 rem side panel (SunSheet) */
  .sun-map__info {
    left: calc(24rem + var(--margin));
  }
}

.sun-map__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  margin: 0 0 var(--space-1);
  padding: var(--space-1) var(--space-2);
  list-style: none;
  width: fit-content;
  background: var(--ground);
}

.sun-map__legend li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sun-map__attribution {
  margin: 0;
  padding: var(--space-1) var(--space-2);
  width: fit-content;
  background: var(--ground);
  pointer-events: auto;
}

.sun-map__attribution a {
  margin-right: var(--space-2);
  color: var(--ink);
}

.sun-map__note,
.sun-map :deep(.sun-map__note) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.sun-map :deep(.ol-zoom) {
  top: calc(var(--safe-top) + var(--space-3));
  left: auto;
  right: var(--margin);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background: none;
}

.sun-map :deep(.ol-zoom button) {
  width: var(--target);
  height: var(--target);
  margin: 0;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: var(--ground);
  color: var(--ink);
  font-size: 1.5rem;
  line-height: 1;
}

.sun-map :deep(.ol-zoom button:hover) {
  background: var(--surface);
}
</style>
