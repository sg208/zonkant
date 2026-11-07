<script setup lang="ts">
import type { AppLocale } from '~/types/locale';
import { formatAltitude, formatCompass, formatTime } from '~/utils/format';
import { hourMarks, sampleSunPath, solsticeDays } from '~/utils/skyPath';

// Text alternative to the camera canvas: the same three arcs, as a table
const props = defineProps<{
  lat: number;
  lon: number;
  // YYYY-MM-DD, the day shown on the selected arc
  date: string;
}>();

interface TimesRow {
  key: string;
  day: string;
  time: string;
  direction: string;
  height: string;
}

const { t, locale } = useI18n();
const appLocale = computed<AppLocale>(() =>
  locale.value === 'nl' ? 'nl' : 'en'
);
const INTL_TAGS: Record<AppLocale, string> = { nl: 'nl-NL', en: 'en-GB' };

const selectedDay = computed(() => {
  const [year = 0, month = 1, day = 1] = props.date.split('-').map(Number);
  return new Date(year, month - 1, day);
});

const rowsForDay = (day: Date, dayLabel: string): TimesRow[] => {
  const language = appLocale.value;
  const sunUpAtFullHours = hourMarks(
    sampleSunPath(day, props.lat, props.lon)
  ).filter(
    // The path ends on the next midnight; that hour belongs to the next day
    ({ time, altitudeDeg }) =>
      time.getDate() === day.getDate() && altitudeDeg > 0
  );
  return sunUpAtFullHours.map(({ time, azimuthDeg, altitudeDeg }) => ({
    key: `${dayLabel}-${time.getTime()}`,
    day: dayLabel,
    time: formatTime(time, language),
    direction: `${Math.round(azimuthDeg)}° ${formatCompass(azimuthDeg, language)}`,
    height: formatAltitude(altitudeDeg, language),
  }));
};

const rows = computed<TimesRow[]>(() => {
  const formatDate = new Intl.DateTimeFormat(INTL_TAGS[appLocale.value], {
    dateStyle: 'long',
  });
  const solstices = solsticeDays(selectedDay.value.getFullYear());
  return [
    ...rowsForDay(
      selectedDay.value,
      t('sky.table.selected', { date: formatDate.format(selectedDay.value) })
    ),
    ...rowsForDay(
      solstices.june,
      t('sky.table.june', { date: formatDate.format(solstices.june) })
    ),
    ...rowsForDay(
      solstices.december,
      t('sky.table.december', { date: formatDate.format(solstices.december) })
    ),
  ];
});
</script>

<template>
  <table class="times">
    <caption class="times__caption">
      {{
        t('sky.table.caption')
      }}
    </caption>
    <thead>
      <tr>
        <th scope="col">{{ t('sky.table.day') }}</th>
        <th scope="col">{{ t('sky.table.time') }}</th>
        <th scope="col">{{ t('sky.table.direction') }}</th>
        <th scope="col">{{ t('sky.table.height') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.key">
        <th scope="row">{{ row.day }}</th>
        <td>{{ row.time }}</td>
        <td>{{ row.direction }}</td>
        <td>{{ row.height }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.times {
  width: 100%;
  border-collapse: collapse;
  overflow-wrap: anywhere;
}
.times__caption {
  padding-bottom: var(--space-2);
  text-align: left;
  font-weight: 700;
}
.times th,
.times td {
  padding: var(--space-1) var(--space-2);
  border-top: 1px solid var(--ink-soft);
  text-align: left;
  vertical-align: top;
}
.times thead th {
  border-top: 2px solid var(--ink);
  border-bottom: 2px solid var(--ink);
}
.times tbody th {
  font-weight: 400;
}
</style>
