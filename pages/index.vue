<script setup lang="ts">
import type { LatLon, MapBearings } from '~/types/sun';
import { deviceTimeZone } from '~/utils/format';
import { getDayTimes, readSun, shadowLength } from '~/utils/sun';
import { viewStateToDate } from '~/utils/urlState';

definePageMeta({ layout: 'app' });

const { state } = useViewState();
const bottomInset = ref(0);

const point = computed<LatLon>(() => ({ lat: state.lat, lon: state.lon }));
const moment = computed(() => viewStateToDate(state));
const reading = computed(() => readSun(moment.value, state.lat, state.lon));
const shadowM = computed(() => shadowLength(reading.value.altitudeDeg, 1));
// Times depend on the day only, so slider moves skip this ~120-sample scan
const times = computed(() =>
  getDayTimes(
    viewStateToDate({ ...state, time: '12:00' }),
    state.lat,
    state.lon
  )
);
const timeZone = deviceTimeZone();

const bearingAt = (when: Date | null): number | null =>
  when ? readSun(when, state.lat, state.lon).bearingDeg : null;

const bearings = computed<MapBearings>(() => {
  const isUp = reading.value.altitudeDeg > 0;
  return {
    sunrise: bearingAt(times.value.sunrise),
    sunset: bearingAt(times.value.sunset),
    sun: isUp ? reading.value.bearingDeg : null,
    shadow: isUp ? (reading.value.bearingDeg + 180) % 360 : null,
  };
});

const handleSelect = (place: LatLon): void => {
  state.lat = place.lat;
  state.lon = place.lon;
};

useHead({ title: 'Zonkant - sun and shadow planner' });
</script>

<template>
  <div class="page">
    <h1 class="visually-hidden page__title">Zonkant</h1>
    <!-- WHY: ClientOnly keeps a changing bottom-inset prop off the SSR placeholder while it hydrates -->
    <ClientOnly>
      <SunMap
        class="page__map"
        :point="point"
        :bearings="bearings"
        :bottom-inset="bottomInset"
        @select="handleSelect"
      />
    </ClientOnly>
    <div class="page__sheet">
      <SunSheet
        v-model:date="state.date"
        v-model:time="state.time"
        :reading="reading"
        :shadow-m="shadowM"
        :times="times"
        :time-zone="timeZone"
        :lat="state.lat"
        :lon="state.lon"
        @place="handleSelect"
        @inset="bottomInset = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  height: 100%;
}
.page__title {
  font-size: 1.5rem;
}
.page__map {
  position: absolute;
  inset: 0;
}
.page__sheet {
  position: absolute;
  inset: auto 0 0 0;
  z-index: 5;
}
@media (min-width: 768px) {
  .page__sheet {
    inset: 0 auto 0 0;
  }
}
</style>
