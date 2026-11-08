<script setup lang="ts">
import {
  padTwoDigits,
  parseClockText,
  toClockText,
  toDateText,
} from '~/utils/dateText';

const MINUTES_PER_DAY = 1440;
const STEP_MIN = 5;

const date = defineModel<string>('date', { required: true });
const time = defineModel<string>('time', { required: true });

const { t } = useI18n();
const id = useId();
const sliderId = `${id}-time`;
const dateId = `${id}-date`;

const minutes = computed(() => {
  const { hours, minutes: minuteOfHour } = parseClockText(time.value);
  return hours * 60 + minuteOfHour;
});

const handleSlide = (event: Event): void => {
  const value = Number((event.target as HTMLInputElement).value);
  const hours = padTwoDigits(Math.floor(value / 60));
  const minutesOfHour = padTwoDigits(value % 60);
  time.value = `${hours}:${minutesOfHour}`;
};

const handleDate = (event: Event): void => {
  const value = (event.target as HTMLInputElement).value;
  if (value) date.value = value;
};

const handleNow = (): void => {
  const now = new Date();
  date.value = toDateText(now);
  time.value = toClockText(now);
};
</script>

<template>
  <div class="time-controls">
    <div class="time-controls__slider">
      <label :for="sliderId"
        >{{ t('time.time') }} <strong>{{ time }}</strong></label
      >
      <input
        :id="sliderId"
        type="range"
        min="0"
        :max="MINUTES_PER_DAY - 1"
        :step="STEP_MIN"
        :value="minutes"
        :aria-valuetext="time"
        @input="handleSlide"
      />
    </div>
    <div class="time-controls__row">
      <div class="time-controls__date">
        <label :for="dateId">{{ t('time.date') }}</label>
        <input :id="dateId" type="date" :value="date" @change="handleDate" />
      </div>
      <button type="button" class="time-controls__now" @click="handleNow">
        {{ t('time.now') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.time-controls {
  display: grid;
  gap: var(--space-3);
}
.time-controls__slider {
  display: grid;
  gap: var(--space-1);
}
label {
  font-size: var(--text-small);
  font-weight: 600;
}
input[type='range'] {
  width: 100%;
  height: var(--target);
  margin: 0;
  accent-color: var(--accent);
  background: transparent;
}
input[type='range']::-webkit-slider-thumb {
  width: var(--target);
  height: var(--target);
}
input[type='range']::-moz-range-thumb {
  width: var(--target);
  height: var(--target);
  border-radius: 0;
}
input[type='range']:focus-visible,
input[type='date']:focus-visible,
button:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.time-controls__row {
  display: flex;
  align-items: end;
  gap: var(--space-3);
}
.time-controls__date {
  display: grid;
  gap: var(--space-1);
  flex: 1;
}
input[type='date'] {
  min-height: var(--target);
  padding: 0 var(--space-2);
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--ground);
  color: var(--ink);
  font: inherit;
}
.time-controls__now {
  min-height: var(--target);
  min-width: var(--target);
  padding: 0 var(--space-3);
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
</style>
