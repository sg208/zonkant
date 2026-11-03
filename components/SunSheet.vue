<script setup lang="ts">
import type { DayTimes, LatLon, SunReading } from '~/types/sun';
import { formatCompass, formatShadow } from '~/utils/format';

const props = defineProps<{
  reading: SunReading;
  // Shadow of a 1 m object on flat ground; null when the sun is not up
  shadowM: number | null;
  times: DayTimes;
  timeZone: string;
  lat: number;
  lon: number;
}>();

const date = defineModel<string>('date', { required: true });
const time = defineModel<string>('time', { required: true });
const emit = defineEmits<{
  place: [place: LatLon];
  // px the sheet covers at the bottom of the map; 0 for the desktop side panel
  inset: [pixels: number];
}>();

const DESKTOP_QUERY = '(min-width: 768px)';

const sheet = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const moreId = `${useId()}-more`;
const legalLinks = [
  { to: '/accessibility', label: 'Accessibility' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/credits', label: 'Credits' },
] as const;
const { repoUrl } = useAppConfig();

const summary = computed(() => {
  const bearing = `${Math.round(props.reading.bearingDeg)}° ${formatCompass(props.reading.bearingDeg)}`;
  if (props.reading.altitudeDeg <= 0)
    return `Sun below the horizon · ${bearing}`;
  return `${props.reading.altitudeDeg.toFixed(1)}° up · ${bearing} · shadow ${formatShadow(props.shadowM)}`;
});

let observer: ResizeObserver | undefined;
let media: MediaQueryList | undefined;

const reportInset = (): void => {
  const isDesktop = media?.matches ?? false;
  emit('inset', isDesktop ? 0 : Math.round(sheet.value?.offsetHeight ?? 0));
};

onMounted(() => {
  media = window.matchMedia?.(DESKTOP_QUERY);
  media?.addEventListener?.('change', reportInset);
  if (sheet.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(reportInset);
    observer.observe(sheet.value);
  }
  reportInset();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  media?.removeEventListener?.('change', reportInset);
});
</script>

<template>
  <div ref="sheet" class="sheet" :data-expanded="isExpanded">
    <div class="sheet__head">
      <p v-if="!isExpanded" class="sheet__summary">
        <span class="sheet__big">{{ reading.altitudeDeg.toFixed(1) }}°</span>
        <span>{{ summary }}</span>
      </p>
      <TimeControls v-model:date="date" v-model:time="time" />
    </div>

    <button
      type="button"
      class="sheet__toggle"
      :aria-expanded="isExpanded"
      :aria-controls="moreId"
      @click="isExpanded = !isExpanded"
    >
      {{ isExpanded ? 'Less' : 'More' }}
    </button>

    <div :id="moreId" class="sheet__more">
      <SunPanel
        :reading="reading"
        :shadow-m="shadowM"
        :times="times"
        :time-zone="timeZone"
      />
      <PlaceInputs :lat="lat" :lon="lon" @update="emit('place', $event)" />
      <nav aria-label="Legal">
        <ul class="sheet__links">
          <li v-for="link in legalLinks" :key="link.to">
            <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
          </li>
          <li>
            <a :href="repoUrl" target="_blank" rel="noopener noreferrer">
              Source on GitHub
              <span class="sheet__sr">(opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.sheet {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) calc(var(--margin) + var(--safe-right))
    calc(var(--space-3) + var(--safe-bottom))
    calc(var(--margin) + var(--safe-left));
  background: var(--ground);
  border-top: 2px solid var(--ink);
  max-height: 70dvh;
  overflow-y: auto;
}
.sheet__summary {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin: 0 0 var(--space-2);
}
.sheet__big {
  font-size: var(--text-readout);
  font-weight: 800;
  line-height: var(--leading-display);
}
.sheet__toggle {
  min-height: var(--target);
  padding: 0 var(--space-3);
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--ground);
  color: var(--ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.sheet__toggle:focus-visible,
.sheet__links a:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.sheet__more {
  display: none;
  gap: var(--space-4);
}
.sheet[data-expanded='true'] .sheet__more {
  display: grid;
}
.sheet__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.sheet__links a {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  text-decoration-thickness: 2px;
}
.sheet__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (min-width: 768px) {
  /* Desktop: full-height side panel, details always open, no toggle */
  .sheet {
    width: 24rem;
    max-height: none;
    height: 100%;
    padding-top: calc(var(--target) + var(--space-5));
    border-top: 0;
    border-right: 2px solid var(--ink);
  }
  .sheet__summary,
  .sheet__toggle {
    display: none;
  }
  .sheet__more {
    display: grid;
  }
}
</style>
