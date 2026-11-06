<script setup lang="ts">
import type { NuxtError } from '#app';

interface Props {
  error: NuxtError;
}

const props = defineProps<Props>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const statusCode = computed(() => props.error?.statusCode ?? 500);
const isNotFound = computed(() => statusCode.value === 404);
const title = computed(() =>
  isNotFound.value ? t('error.notFoundTitle') : t('error.failedTitle')
);
const body = computed(() =>
  isNotFound.value
    ? t('error.notFoundBody')
    : t('error.failedBody', { code: statusCode.value })
);

useHead({
  htmlAttrs: { lang: locale },
  title: computed(() => `${title.value} - Zonkant`),
  meta: [{ name: 'robots', content: 'noindex' }],
});
</script>

<template>
  <NuxtLayout>
    <section class="error-page">
      <h1 class="error-page__title">{{ title }}</h1>
      <div>
        <p class="error-page__body">{{ body }}</p>
        <a :href="localePath('/')" class="error-page__home">{{
          t('error.home')
        }}</a>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-5);
  min-height: 60dvh;
  padding: var(--space-5) calc(var(--margin) + var(--safe-right)) var(--space-5)
    calc(var(--margin) + var(--safe-left));
}
.error-page__title {
  font-size: clamp(2.25rem, 10vw, 6rem);
  font-weight: 800;
  line-height: var(--leading-display);
}
.error-page__body {
  max-width: 40ch;
}
.error-page__home {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  margin-top: var(--space-4);
  padding: 0 var(--space-4);
  background: var(--ink);
  color: var(--ground);
  font-weight: 700;
}
</style>
