<script setup lang="ts">
import type { AppLocale } from '~/types/locale';
import type { DayTimes, SunReading, TimeRange } from '~/types/sun';
import {
  formatAltitude,
  formatCompass,
  formatDuration,
  formatShadow,
  formatTime,
} from '~/utils/format';

const props = defineProps<{
  reading: SunReading;
  // Shadow of a 1 m object on flat ground; null when the sun is not up
  shadowM: number | null;
  times: DayTimes;
  timeZone: string;
}>();

const { t, locale } = useI18n();
const appLocale = computed<AppLocale>(() =>
  locale.value === 'nl' ? 'nl' : 'en'
);

const isBelowHorizon = computed(() => props.reading.altitudeDeg <= 0);

const dayNote = computed(() => {
  if (props.times.daylight === 'polar-day') return t('panel.polarDay');
  if (props.times.daylight === 'polar-night') return t('panel.polarNight');
  if (isBelowHorizon.value) return t('panel.belowHorizon');
  return '';
});

const eventText = (date: Date | null): string => {
  if (date) return formatTime(date, appLocale.value);
  if (props.times.daylight === 'polar-day') return t('panel.staysUp');
  if (props.times.daylight === 'polar-night') return t('panel.staysDown');
  return t('panel.none');
};

const rangeText = (range: TimeRange): string =>
  range.start || range.end
    ? `${formatTime(range.start, appLocale.value)}-${formatTime(range.end, appLocale.value)}`
    : t('panel.none');

const bothRanges = (morning: TimeRange, evening: TimeRange): string =>
  t('panel.bothRanges', {
    morning: rangeText(morning),
    evening: rangeText(evening),
  });
</script>

<template>
  <section class="sun-panel" aria-labelledby="sun-panel-title">
    <h2 id="sun-panel-title" class="sun-panel__title">
      {{ t('panel.title') }}
    </h2>
    <dl class="sun-panel__primary">
      <div>
        <dt>{{ t('panel.altitude') }}</dt>
        <dd class="sun-panel__big">
          {{ formatAltitude(reading.altitudeDeg, appLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('panel.bearing') }}</dt>
        <dd class="sun-panel__big">
          {{ Math.round(reading.bearingDeg) }}°
          {{ formatCompass(reading.bearingDeg, appLocale) }}
        </dd>
      </div>
      <div>
        <dt>{{ t('panel.shadow') }}</dt>
        <dd class="sun-panel__big">{{ formatShadow(shadowM, appLocale) }}</dd>
      </div>
    </dl>
    <p v-if="dayNote" class="sun-panel__note">{{ dayNote }}</p>

    <h3 class="sun-panel__subtitle">{{ t('panel.today') }}</h3>
    <dl class="sun-panel__times">
      <div>
        <dt>{{ t('panel.sunrise') }}</dt>
        <dd>{{ eventText(times.sunrise) }}</dd>
      </div>
      <div>
        <dt>{{ t('panel.sunset') }}</dt>
        <dd>{{ eventText(times.sunset) }}</dd>
      </div>
      <div>
        <dt>{{ t('panel.goldenHour') }}</dt>
        <dd>{{ bothRanges(times.goldenMorning, times.goldenEvening) }}</dd>
      </div>
      <div>
        <dt>{{ t('panel.blueHour') }}</dt>
        <dd>{{ bothRanges(times.blueMorning, times.blueEvening) }}</dd>
      </div>
      <div>
        <dt>{{ t('panel.dayLength') }}</dt>
        <dd>{{ formatDuration(times.dayLengthMin, appLocale) }}</dd>
      </div>
    </dl>
    <p class="sun-panel__fine">
      {{ t('panel.fine', { timeZone }) }}
    </p>
  </section>
</template>

<style scoped>
.sun-panel {
  display: grid;
  gap: var(--space-3);
  /* cqi below sizes the readouts from the panel width, not the viewport */
  container-type: inline-size;
}
.sun-panel__title,
.sun-panel__subtitle {
  font-size: var(--text-body);
  font-weight: 700;
  color: var(--ink-soft);
}
dl,
dd {
  margin: 0;
}
.sun-panel__primary {
  display: grid;
  gap: var(--space-3);
}
dt {
  font-size: var(--text-small);
  color: var(--ink-soft);
}
.sun-panel__big {
  /* One column, one line: "No shadow" and "359° NNW" at 15cqi stay under the panel width */
  font-size: clamp(2rem, 15cqi, 4rem);
  white-space: nowrap;
  font-weight: 800;
  line-height: var(--leading-display);
}
.sun-panel__note {
  padding: var(--space-2) var(--space-3);
  background: var(--surface);
  font-weight: 600;
}
.sun-panel__times {
  display: grid;
  gap: var(--space-2);
}
.sun-panel__times > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  border-top: 2px solid var(--surface);
  padding-top: var(--space-2);
}
.sun-panel__times dd {
  font-weight: 600;
  text-align: right;
}
.sun-panel__fine {
  font-size: var(--text-small);
  color: var(--ink-soft);
}
</style>
