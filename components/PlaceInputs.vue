<script setup lang="ts">
import type { LatLon } from '~/types/sun';
import type { GeolocationState } from '~/composables/useGeolocation';

const props = defineProps<LatLon>();
const emit = defineEmits<{ update: [place: LatLon] }>();

const { t } = useI18n();
const id = useId();
const { state: geoState, coords, locate } = useGeolocation();

const GEO_MESSAGE_KEYS: Record<GeolocationState, string> = {
  idle: '',
  pending: 'place.geo.pending',
  granted: 'place.geo.granted',
  denied: 'place.geo.denied',
  unsupported: 'place.geo.unsupported',
  error: 'place.geo.error',
};

const formatCoordinate = (value: number): string =>
  String(Number(value.toFixed(5)));
const draftLat = ref(formatCoordinate(props.lat));
const draftLon = ref(formatCoordinate(props.lon));
const latError = ref('');
const lonError = ref('');

const clearErrors = (): void => {
  latError.value = '';
  lonError.value = '';
};

const validateCoordinate = (
  draft: string,
  limit: number,
  label: string
): string => {
  if (draft.trim() === '' || Number.isNaN(Number(draft)))
    return t('place.enterNumber');
  return Math.abs(Number(draft)) <= limit
    ? ''
    : t('place.outOfRange', { label, limit });
};

const handleInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'lat') draftLat.value = input.value;
  else draftLon.value = input.value;
  latError.value = validateCoordinate(draftLat.value, 90, t('place.latitude'));
  lonError.value = validateCoordinate(
    draftLon.value,
    180,
    t('place.longitude')
  );
  if (!latError.value && !lonError.value) {
    emit('update', {
      lat: Number(draftLat.value),
      lon: Number(draftLon.value),
    });
  }
};

// Map clicks and "Locate me" arrive as props; keep what the user is typing if it already matches
watch(
  () => [props.lat, props.lon],
  () => {
    if (Number(draftLat.value) !== props.lat)
      draftLat.value = formatCoordinate(props.lat);
    if (Number(draftLon.value) !== props.lon)
      draftLon.value = formatCoordinate(props.lon);
    clearErrors();
  }
);

watch(coords, (place) => {
  if (!place) return;
  draftLat.value = formatCoordinate(place.lat);
  draftLon.value = formatCoordinate(place.lon);
  clearErrors();
  emit('update', place);
});

// The privacy hint always describes both inputs; an error id joins it when set,
// listed first so a screen reader announces what is wrong before the hint.
const describedBy = (field: 'lat' | 'lon', hasError: boolean): string => {
  const hintId = `${id}-hint`;
  if (!hasError) return hintId;
  return `${id}-${field}-error ${hintId}`;
};
const latDescribedBy = computed(() =>
  describedBy('lat', Boolean(latError.value))
);
const lonDescribedBy = computed(() =>
  describedBy('lon', Boolean(lonError.value))
);

const geoMessage = computed(() => {
  const key = GEO_MESSAGE_KEYS[geoState.value];
  return key ? t(key) : '';
});
</script>

<template>
  <form class="place" novalidate @submit.prevent>
    <div class="place__field">
      <label :for="`${id}-lat`">{{ t('place.latitude') }}</label>
      <input
        :id="`${id}-lat`"
        :value="draftLat"
        name="lat"
        type="number"
        inputmode="decimal"
        step="any"
        :aria-invalid="latError ? 'true' : undefined"
        :aria-describedby="latDescribedBy"
        @input="handleInput"
      />
    </div>
    <div class="place__field">
      <label :for="`${id}-lon`">{{ t('place.longitude') }}</label>
      <input
        :id="`${id}-lon`"
        :value="draftLon"
        name="lon"
        type="number"
        inputmode="decimal"
        step="any"
        :aria-invalid="lonError ? 'true' : undefined"
        :aria-describedby="lonDescribedBy"
        @input="handleInput"
      />
    </div>
    <button type="button" class="place__locate" @click="locate">
      {{ t('place.locate') }}
    </button>
    <div class="place__messages" role="status">
      <p v-if="latError" :id="`${id}-lat-error`" class="place__error">
        {{ latError }}
      </p>
      <p v-if="lonError" :id="`${id}-lon-error`" class="place__error">
        {{ lonError }}
      </p>
      <p v-if="geoMessage">{{ geoMessage }}</p>
    </div>
    <p :id="`${id}-hint`" class="place__hint">
      {{ t('place.hint') }}
    </p>
  </form>
</template>

<style scoped>
.place {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.place__field {
  display: grid;
  gap: var(--space-1);
}
label {
  font-size: var(--text-small);
  font-weight: 600;
}
input {
  min-height: var(--target);
  width: 100%;
  padding: 0 var(--space-2);
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--ground);
  color: var(--ink);
  font: inherit;
}
input[aria-invalid='true'] {
  border-color: var(--accent);
}
input:focus-visible,
button:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.place__locate {
  grid-column: 1 / -1;
  min-height: var(--target);
  border: 2px solid var(--ink);
  border-radius: 0;
  background: var(--accent);
  color: var(--accent-ink);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.place__messages,
.place__hint {
  grid-column: 1 / -1;
  font-size: var(--text-small);
}
.place__error {
  color: var(--accent);
  font-weight: 700;
}
.place__hint {
  color: var(--ink-soft);
}
</style>
