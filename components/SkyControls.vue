<script setup lang="ts">
const props = defineProps<{
  isCalibrated: boolean;
  canCalibrate: boolean;
  // Visible reason the Calibrate button is disabled; null when it is not
  calibrateNote: string | null;
  headingOffsetDeg: number;
}>();

const fovDeg = defineModel<number>('fovDeg', { required: true });
const emit = defineEmits<{
  calibrate: [];
  nudge: [step: 1 | -1];
  reset: [];
}>();

const { t } = useI18n();
const { intlTag } = useAppLocale();
const noteId = `${useId()}-note`;
const fovId = `${useId()}-fov`;

const fovText = computed(() => `${fovDeg.value}°`);

const offsetText = computed(() => {
  const formatter = new Intl.NumberFormat(intlTag.value, {
    signDisplay: 'exceptZero',
    maximumFractionDigits: 1,
  });
  return `${formatter.format(props.headingOffsetDeg)}°`;
});
</script>

<template>
  <div class="controls" role="group" :aria-label="t('sky.controls.label')">
    <!-- ONE persistent element: swapping v-if/v-else replaced the node and the
         status change never reached a screen reader -->
    <p
      class="controls__message"
      :class="{ 'controls__message--warn': !isCalibrated }"
      role="status"
    >
      {{
        isCalibrated ? t('sky.controls.calibrated') : t('sky.controls.warning')
      }}
    </p>

    <div class="controls__row">
      <button
        type="button"
        :disabled="!canCalibrate"
        :aria-describedby="calibrateNote ? noteId : undefined"
        @click="emit('calibrate')"
      >
        {{ t('sky.controls.calibrate') }}
      </button>
      <button type="button" @click="emit('nudge', -1)">
        {{ t('sky.controls.headingMinus') }}
      </button>
      <button type="button" @click="emit('nudge', 1)">
        {{ t('sky.controls.headingPlus') }}
      </button>
      <button type="button" @click="emit('reset')">
        {{ t('sky.controls.reset') }}
      </button>
    </div>
    <p v-if="calibrateNote" :id="noteId" class="controls__note">
      {{ calibrateNote }}
    </p>
    <p class="controls__note" aria-live="polite">
      {{ t('sky.controls.offset', { degrees: offsetText }) }}
    </p>

    <div class="controls__fov">
      <label :for="fovId">{{ t('sky.controls.fov') }}</label>
      <input
        :id="fovId"
        v-model.number="fovDeg"
        type="range"
        min="40"
        max="90"
        step="1"
        :aria-valuetext="fovText"
      />
      <span aria-hidden="true">{{ fovText }}</span>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: grid;
  gap: var(--space-2);
}
.controls__message {
  padding: var(--space-2) var(--space-3);
  border: 2px solid var(--ink);
}
.controls__message--warn {
  border-color: var(--accent);
  font-weight: 700;
}
.controls__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.controls__row button {
  padding: 0 var(--space-3);
  border: 2px solid var(--ink);
  background: var(--ground);
  font-weight: 700;
  cursor: pointer;
}
.controls__row button:disabled {
  border-style: dashed;
  color: var(--ink-soft);
  cursor: not-allowed;
}
.controls__note {
  color: var(--ink-soft);
}
.controls__fov {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}
.controls__fov input {
  flex: 1 1 8rem;
  min-height: var(--target);
}
</style>
