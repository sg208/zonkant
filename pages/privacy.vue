<script setup lang="ts">
const { t } = useI18n();
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;
const locateLabel = computed(() => t('place.locate'));

usePageHead({
  titleKey: 'privacy.title',
  descriptionKey: 'privacy.description',
});
</script>

<template>
  <LegalPage :title="t('privacy.title')" :lead="t('privacy.lead')">
    <h2>{{ t('privacy.device.heading') }}</h2>
    <p>{{ t('privacy.device.body') }}</p>
    <p>{{ t('privacy.device.language') }}</p>

    <h2>{{ t('privacy.location.heading') }}</h2>
    <p>{{ t('privacy.location.press', { locate: locateLabel }) }}</p>
    <p>{{ t('privacy.location.zone') }}</p>
    <i18n-t keypath="privacy.location.shared" tag="p">
      <template #example>
        <code>?lat=52.37&amp;lon=4.89</code>
      </template>
    </i18n-t>

    <h2>{{ t('privacy.sky.heading') }}</h2>
    <p>{{ t('privacy.sky.camera', { start: t('sky.start') }) }}</p>
    <p>{{ t('privacy.sky.sensors') }}</p>

    <h2>{{ t('privacy.who.heading') }}</h2>
    <p>{{ t('privacy.who.intro') }}</p>
    <ul>
      <li>{{ t('privacy.who.tiles') }}</li>
      <li>{{ t('privacy.who.photon', { locate: locateLabel }) }}</li>
      <li>{{ t('privacy.who.cloudflare') }}</li>
    </ul>
    <p>{{ t('privacy.who.local') }}</p>

    <h2>{{ t('privacy.tracking.heading') }}</h2>
    <p>{{ t('privacy.tracking.body') }}</p>

    <h2>{{ t('privacy.questions.heading') }}</h2>
    <i18n-t keypath="privacy.questions.body" tag="p">
      <template #github>
        <a :href="issuesUrl">GitHub</a>
      </template>
    </i18n-t>
  </LegalPage>
</template>
