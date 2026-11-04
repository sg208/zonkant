<script setup lang="ts">
import type { GeocodePlace } from '~/types/geocode';
import type { LatLon } from '~/types/sun';

const emit = defineEmits<{ update: [place: LatLon] }>();

const id = useId();
const listId = `${id}-list`;
const { results, status, search, clear } = usePlaceSearch();

const query = ref('');
const isOpen = ref(false);
const activeIndex = ref(-1);
const movedTo = ref('');

const optionId = (index: number): string => `${id}-option-${index}`;
const isExpanded = computed(() => isOpen.value && results.value.length > 0);
const activeId = computed(() =>
  isExpanded.value && activeIndex.value >= 0
    ? optionId(activeIndex.value)
    : undefined
);

const message = computed(() => {
  if (movedTo.value) return `Moved to ${movedTo.value}`;
  const count = results.value.length;
  if (status.value === 'loading') return 'Searching…';
  if (status.value === 'results')
    return `${count} ${count === 1 ? 'place' : 'places'} found`;
  if (status.value === 'empty') return 'No places found';
  if (status.value === 'error')
    return 'Search is unavailable. Check your connection or type coordinates.';
  return '';
});

const isPopoverShown = computed(
  () =>
    isOpen.value &&
    (status.value === 'loading' ||
      status.value === 'empty' ||
      status.value === 'error')
);

const handleInput = (event: Event): void => {
  query.value = (event.target as HTMLInputElement).value;
  movedTo.value = '';
  activeIndex.value = -1;
  isOpen.value = true;
  search(query.value);
};

const select = (place: GeocodePlace): void => {
  clear();
  query.value = place.label;
  movedTo.value = place.label;
  isOpen.value = false;
  activeIndex.value = -1;
  emit('update', { lat: place.lat, lon: place.lon });
};

const move = (step: 1 | -1): void => {
  const count = results.value.length;
  if (count === 0) return;
  isOpen.value = true;
  const next = activeIndex.value + step;
  if (activeIndex.value < 0) activeIndex.value = step === 1 ? 0 : count - 1;
  else activeIndex.value = (next + count) % count;
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    move(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    move(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const place = isExpanded.value ? results.value[activeIndex.value] : null;
    if (place) select(place);
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault();
    isOpen.value = false;
    activeIndex.value = -1;
  }
};

// Keeps focus on the input so blur does not close the list before the click lands
const handleOptionMousedown = (event: MouseEvent): void => {
  event.preventDefault();
};

const handleBlur = (): void => {
  isOpen.value = false;
  activeIndex.value = -1;
};
</script>

<template>
  <div class="search">
    <label :for="`${id}-input`">Search a place</label>
    <div class="search__field">
      <input
        :id="`${id}-input`"
        :value="query"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="isExpanded"
        :aria-controls="listId"
        :aria-activedescendant="activeId"
        autocomplete="off"
        enterkeyhint="search"
        spellcheck="false"
        @input="handleInput"
        @keydown="handleKeydown"
        @blur="handleBlur"
      />
      <ul v-show="isExpanded" :id="listId" role="listbox" class="search__list">
        <li
          v-for="(place, index) in results"
          :id="optionId(index)"
          :key="place.id"
          role="option"
          :aria-selected="index === activeIndex"
          class="search__option"
          @mousedown="handleOptionMousedown"
          @click="select(place)"
        >
          {{ place.label }}
        </li>
      </ul>
      <p
        v-if="isPopoverShown"
        class="search__popover"
        :class="{ search__error: status === 'error' }"
        aria-hidden="true"
        @mousedown="handleOptionMousedown"
      >
        {{ message }}
      </p>
    </div>
    <div class="search__messages" role="status" aria-live="polite">
      <p v-if="message" :class="{ search__error: status === 'error' }">
        {{ message }}
      </p>
    </div>
    <p class="search__hint">
      Search text is sent to Photon (komoot) to find places.
    </p>
  </div>
</template>

<style scoped>
.search {
  position: relative;
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
input:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.search__field {
  position: relative;
}
.search__list,
.search__popover {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 2;
  margin: 0;
  border: 2px solid var(--ink);
  background: var(--ground);
}
.search__list {
  padding: 0;
  max-height: min(14rem, 40dvh);
  overflow-y: auto;
  list-style: none;
}
.search__popover {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-small);
  overflow-wrap: anywhere;
}
.search__option {
  display: flex;
  align-items: center;
  min-height: var(--target);
  padding: var(--space-1) var(--space-2);
  overflow-wrap: anywhere;
  cursor: pointer;
}
.search__option + .search__option {
  border-top: 1px solid var(--ink);
}
.search__option[aria-selected='true'] {
  background: var(--accent);
  color: var(--accent-ink);
  outline: 3px solid var(--focus);
  outline-offset: -3px;
}
.search__messages,
.search__hint {
  font-size: var(--text-small);
}
.search__hint {
  margin: 0;
}
/* Announced by AT, never takes layout space */
.search__messages {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.search__error {
  color: var(--accent);
  font-weight: 700;
}
.search__hint {
  color: var(--ink-soft);
}
</style>
