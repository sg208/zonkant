<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;

usePageHead({ titleKey: 'terms.title', descriptionKey: 'terms.description' });
</script>

<template>
  <LegalPage :title="t('terms.title')" :lead="t('terms.lead')">
    <h2>{{ t('terms.code.heading') }}</h2>
    <i18n-t keypath="terms.code.body" tag="p">
      <template #license>
        <a :href="`${repoUrl}/blob/main/LICENSE`">{{
          t('terms.code.license')
        }}</a>
      </template>
    </i18n-t>

    <h2>{{ t('terms.estimates.heading') }}</h2>
    <p>{{ t('terms.estimates.body') }}</p>
    <p>{{ t('terms.estimates.sun') }}</p>

    <h2>{{ t('terms.mapData.heading') }}</h2>
    <i18n-t keypath="terms.mapData.body" tag="p">
      <template #odbl>
        <a href="https://www.openstreetmap.org/copyright">ODbL</a>
      </template>
      <template #openFreeMapTerms>
        <a href="https://openfreemap.org/tos/">{{
          t('terms.mapData.openFreeMapTerms')
        }}</a>
      </template>
      <template #openMapTiles>
        <a href="https://www.openmaptiles.org/">OpenMapTiles</a>
      </template>
      <template #credits>
        <NuxtLink :to="localePath('/credits')">{{
          t('terms.mapData.credits')
        }}</NuxtLink>
      </template>
    </i18n-t>

    <h2>{{ t('terms.data.heading') }}</h2>
    <i18n-t keypath="terms.data.body" tag="p">
      <template #privacy>
        <NuxtLink :to="localePath('/privacy')">{{
          t('terms.data.privacy')
        }}</NuxtLink>
      </template>
    </i18n-t>

    <h2>{{ t('terms.questions.heading') }}</h2>
    <i18n-t keypath="terms.questions.body" tag="p">
      <template #github>
        <a :href="issuesUrl">GitHub</a>
      </template>
    </i18n-t>
  </LegalPage>
</template>
