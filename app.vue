<script setup lang="ts">
import { langRedirectScript } from '~/utils/langRedirect';

const { locale } = useI18n();
const localeHead = useLocaleHead({ dir: false, seo: true });

useHead(() => ({
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  meta: localeHead.value.meta,
}));

// Server only: a client-side head update would re-run the script on every
// in-app switch to a Dutch page
if (import.meta.server && locale.value === 'nl') {
  useHead({
    script: [{ innerHTML: langRedirectScript, tagPriority: 'critical' }],
  });
}
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
