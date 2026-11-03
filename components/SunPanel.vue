<script setup lang="ts">
import type { DayTimes, SunReading, TimeRange } from '~/types/sun';
import {
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

const isBelowHorizon = computed(() => props.reading.altitudeDeg <= 0);

const dayNote = computed(() => {
  if (props.times.daylight === 'polar-day')
    return 'Polar day: the sun does not set today.';
  if (props.times.daylight === 'polar-night')
    return 'Polar night: the sun does not rise today.';
  if (isBelowHorizon.value) return 'The sun is below the horizon at this time.';
  return '';
});

const eventText = (date: Date | null): string => {
  if (date) return formatTime(date);
  if (props.times.daylight === 'polar-day') return 'Sun stays up';
  if (props.times.daylight === 'polar-night') return 'Sun stays down';
  return 'None today';
};

const rangeText = (range: TimeRange): string =>
  range.start || range.end
    ? `${formatTime(range.start)}-${formatTime(range.end)}`
    : 'None today';

const bothRanges = (morning: TimeRange, evening: TimeRange): string =>
  `${rangeText(morning)} and ${rangeText(evening)}`;
</script>

<template>
  <section class="sun-panel" aria-labelledby="sun-panel-title">
    <h2 id="sun-panel-title" class="sun-panel__title">Sun right now</h2>
    <dl class="sun-panel__primary">
      <div>
        <dt>Altitude</dt>
        <dd class="sun-panel__big">{{ reading.altitudeDeg.toFixed(1) }}°</dd>
      </div>
      <div>
        <dt>Bearing</dt>
        <dd class="sun-panel__big">
          {{ Math.round(reading.bearingDeg) }}°
          {{ formatCompass(reading.bearingDeg) }}
        </dd>
      </div>
      <div>
        <dt>Shadow of 1 m</dt>
        <dd class="sun-panel__big">{{ formatShadow(shadowM) }}</dd>
      </div>
    </dl>
    <p v-if="dayNote" class="sun-panel__note">{{ dayNote }}</p>

    <h3 class="sun-panel__subtitle">Today</h3>
    <dl class="sun-panel__times">
      <div>
        <dt>Sunrise</dt>
        <dd>{{ eventText(times.sunrise) }}</dd>
      </div>
      <div>
        <dt>Sunset</dt>
        <dd>{{ eventText(times.sunset) }}</dd>
      </div>
      <div>
        <dt>Golden hour</dt>
        <dd>{{ bothRanges(times.goldenMorning, times.goldenEvening) }}</dd>
      </div>
      <div>
        <dt>Blue hour</dt>
        <dd>{{ bothRanges(times.blueMorning, times.blueEvening) }}</dd>
      </div>
      <div>
        <dt>Day length</dt>
        <dd>{{ formatDuration(times.dayLengthMin) }}</dd>
      </div>
    </dl>
    <p class="sun-panel__fine">
      Times in {{ timeZone }} (this device's time zone). Shadows assume flat
      ground, no buildings.
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
