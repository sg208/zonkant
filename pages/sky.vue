<script setup lang="ts">
import { toQuery } from '~/utils/urlState';

// WHY: the lint rule wants multi-word component names and the file is named after its route
defineOptions({ name: 'SkyPage' });
definePageMeta({ layout: 'app' });

const { t } = useI18n();
const localePath = useLocalePath();
const { state } = useViewState();

const mapLink = computed(() =>
  localePath({ path: '/', query: toQuery(state) })
);

usePageHead({ titleKey: 'sky.link', descriptionKey: 'sky.description' });
</script>

<template>
  <div class="sky">
    <div class="sky__inner">
      <h1 class="sky__title">
        {{ t('sky.title') }}
        <span class="sky__beta">{{ t('sky.beta') }}</span>
      </h1>
      <p class="sky__lead">{{ t('sky.lead') }}</p>
      <!-- WHY: ClientOnly keeps camera and sensor state out of the prerendered HTML -->
      <ClientOnly>
        <SkyCanvas :lat="state.lat" :lon="state.lon" :date="state.date" />
        <template #fallback>
          <p class="sky__status">
            {{ t('sky.status.idle', { start: t('sky.start') }) }}
          </p>
        </template>
      </ClientOnly>
      <section aria-labelledby="sky-table-heading" class="sky__table">
        <h2 id="sky-table-heading">{{ t('sky.table.heading') }}</h2>
        <SkyTimesTable :lat="state.lat" :lon="state.lon" :date="state.date" />
      </section>
      <NuxtLink :to="mapLink" class="sky__back">{{ t('sky.back') }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.sky {
  height: 100%;
  overflow-y: auto;
  padding: calc(var(--target) + var(--space-5))
    calc(var(--margin) + var(--safe-right))
    calc(var(--space-5) + var(--safe-bottom))
    calc(var(--margin) + var(--safe-left));
}
.sky__inner {
  display: grid;
  gap: var(--space-4);
  max-width: 60rem;
}
.sky__title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
  font-size: clamp(2rem, 9vw, 4rem);
  font-weight: 800;
  line-height: var(--leading-display);
}
.sky__beta {
  padding: 0 var(--space-2);
  border: 2px solid var(--ink);
  font-size: var(--text-small);
  font-weight: 700;
  line-height: 1.75;
}
.sky__lead {
  max-width: 40ch;
  font-size: 1.25rem;
  line-height: 1.35;
}
.sky__status {
  max-width: 65ch;
  padding: var(--space-3);
  border: 2px solid var(--ink);
}
.sky__table h2 {
  margin-bottom: var(--space-2);
  font-size: 1.375rem;
  font-weight: 800;
}
.sky__back {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: var(--target);
  font-weight: 700;
}
</style>
