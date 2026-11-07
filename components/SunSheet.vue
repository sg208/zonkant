<script setup lang="ts">
import type { DayTimes, LatLon, SunReading } from '~/types/sun';
import type { AppLocale } from '~/types/locale';
import { formatAltitude, formatCompass, formatShadow } from '~/utils/format';
import { toQuery } from '~/utils/urlState';

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
const { t, locale } = useI18n();
const localePath = useLocalePath();
const appLocale = computed<AppLocale>(() =>
  locale.value === 'nl' ? 'nl' : 'en'
);
const legalLinks = [
  { to: '/accessibility', labelKey: 'sheet.links.accessibility' },
  { to: '/privacy', labelKey: 'sheet.links.privacy' },
  { to: '/terms', labelKey: 'sheet.links.terms' },
  { to: '/credits', labelKey: 'sheet.links.credits' },
] as const;
const { repoUrl } = useAppConfig();
// Sky view opens on the same place and moment as the map
const skyLink = computed(() =>
  localePath({
    path: '/sky',
    query: toQuery({
      lat: props.lat,
      lon: props.lon,
      date: date.value,
      time: time.value,
    }),
  })
);

const altitudeText = computed(() =>
  formatAltitude(props.reading.altitudeDeg, appLocale.value)
);

const summary = computed(() => {
  const bearing = `${Math.round(props.reading.bearingDeg)}° ${formatCompass(props.reading.bearingDeg, appLocale.value)}`;
  if (props.reading.altitudeDeg <= 0)
    return t('sheet.summaryDown', { bearing });
  return t('sheet.summaryUp', {
    altitude: altitudeText.value,
    bearing,
    shadow: formatShadow(props.shadowM, appLocale.value),
  });
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
        <span class="sheet__big">{{ altitudeText }}</span>
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
      {{ isExpanded ? t('sheet.less') : t('sheet.more') }}
    </button>

    <div :id="moreId" class="sheet__more">
      <SunPanel
        :reading="reading"
        :shadow-m="shadowM"
        :times="times"
        :time-zone="timeZone"
      />
      <PlaceSearch @update="emit('place', $event)" />
      <PlaceInputs :lat="lat" :lon="lon" @update="emit('place', $event)" />
      <nav :aria-label="t('sheet.legalLabel')">
        <ul class="sheet__links">
          <li>
            <NuxtLink :to="skyLink">{{ t('sky.link') }}</NuxtLink>
          </li>
          <li v-for="link in legalLinks" :key="link.to">
            <NuxtLink :to="localePath(link.to)">{{
              t(link.labelKey)
            }}</NuxtLink>
          </li>
          <li>
            <a :href="repoUrl" target="_blank" rel="noopener noreferrer">
              {{ t('links.source') }}
              <span class="sheet__sr">{{ t('common.opensInNewTab') }}</span>
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
