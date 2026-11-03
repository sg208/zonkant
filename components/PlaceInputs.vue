<script setup lang="ts">
import type { LatLon } from '~/types/sun';
import type { GeolocationState } from '~/composables/useGeolocation';

const props = defineProps<LatLon>();
const emit = defineEmits<{ update: [place: LatLon] }>();

const id = useId();
const { state: geoState, coords, locate } = useGeolocation();

const GEO_MESSAGES: Record<GeolocationState, string> = {
  idle: '',
  pending: 'Finding your location...',
  granted: 'Location found. It stays on this device.',
  denied:
    'Location permission was denied. You can still type coordinates or tap the map.',
  unsupported:
    'This browser cannot share its location. Type coordinates or tap the map.',
  error:
    'Could not get your location. Try again, type coordinates or tap the map.',
};

const show = (value: number): string => String(Number(value.toFixed(5)));
const draftLat = ref(show(props.lat));
const draftLon = ref(show(props.lon));
const latError = ref('');
const lonError = ref('');

const check = (draft: string, limit: number, label: string): string => {
  if (draft.trim() === '' || Number.isNaN(Number(draft)))
    return 'Enter a number';
  return Math.abs(Number(draft)) <= limit
    ? ''
    : `${label} must be between -${limit} and ${limit}`;
};

const handleInput = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (input.name === 'lat') draftLat.value = input.value;
  else draftLon.value = input.value;
  latError.value = check(draftLat.value, 90, 'Latitude');
  lonError.value = check(draftLon.value, 180, 'Longitude');
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
    if (Number(draftLat.value) !== props.lat) draftLat.value = show(props.lat);
    if (Number(draftLon.value) !== props.lon) draftLon.value = show(props.lon);
    latError.value = '';
    lonError.value = '';
  }
);

watch(coords, (place) => {
  if (!place) return;
  draftLat.value = show(place.lat);
  draftLon.value = show(place.lon);
  latError.value = '';
  lonError.value = '';
  emit('update', place);
});

const geoMessage = computed(() => GEO_MESSAGES[geoState.value]);
</script>

<template>
  <form class="place" novalidate @submit.prevent>
    <div class="place__field">
      <label :for="`${id}-lat`">Latitude</label>
      <input
        :id="`${id}-lat`"
        :value="draftLat"
        name="lat"
        type="number"
        inputmode="decimal"
        step="any"
        :aria-invalid="latError ? 'true' : undefined"
        :aria-describedby="latError ? `${id}-lat-error` : undefined"
        @input="handleInput"
      />
    </div>
    <div class="place__field">
      <label :for="`${id}-lon`">Longitude</label>
      <input
        :id="`${id}-lon`"
        :value="draftLon"
        name="lon"
        type="number"
        inputmode="decimal"
        step="any"
        :aria-invalid="lonError ? 'true' : undefined"
        :aria-describedby="lonError ? `${id}-lon-error` : undefined"
        @input="handleInput"
      />
    </div>
    <button type="button" class="place__locate" @click="locate">
      Locate me
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
    <p class="place__hint">
      Your location stays on this device and is never sent anywhere.
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
