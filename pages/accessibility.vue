<script setup lang="ts">
const { t } = useI18n();
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;
const locateLabel = computed(() => t('place.locate'));
const inPlaceKeys = [
  'keyboard',
  'skip',
  'contrast',
  'readout',
  'motion',
] as const;

usePageHead({
  titleKey: 'accessibility.title',
  descriptionKey: 'accessibility.description',
});
</script>

<template>
  <LegalPage :title="t('accessibility.title')" :lead="t('accessibility.lead')">
    <h2>{{ t('accessibility.inPlace.heading') }}</h2>
    <ul>
      <li>{{ t('accessibility.inPlace.place', { locate: locateLabel }) }}</li>
      <li v-for="key in inPlaceKeys" :key="key">
        {{ t(`accessibility.inPlace.${key}`) }}
      </li>
    </ul>

    <h2>{{ t('accessibility.sky.heading') }}</h2>
    <p>{{ t('accessibility.sky.beta') }}</p>
    <p>{{ t('accessibility.sky.alternative') }}</p>
    <p>{{ t('accessibility.sky.compass') }}</p>

    <h2>{{ t('accessibility.limits.heading') }}</h2>
    <p>{{ t('accessibility.limits.body') }}</p>

    <h2>{{ t('accessibility.review.heading') }}</h2>
    <p>{{ t('accessibility.review.body') }}</p>

    <h2>{{ t('accessibility.barrier.heading') }}</h2>
    <i18n-t keypath="accessibility.barrier.body" tag="p">
      <template #github>
        <a :href="issuesUrl">GitHub</a>
      </template>
    </i18n-t>
  </LegalPage>
</template>
