<script setup lang="ts">
const { t, locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

// Two locales only: the switcher offers the one not currently shown
const otherLocale = computed(() => {
  const candidates = locales.value.filter(
    (entry) => entry.code !== locale.value
  );
  return candidates[0] ?? null;
});
</script>

<template>
  <nav v-if="otherLocale" :aria-label="t('language.label')">
    <NuxtLink
      :to="switchLocalePath(otherLocale.code)"
      :lang="otherLocale.code"
      :hreflang="otherLocale.code"
      class="language-switcher"
    >
      {{ otherLocale.name }}
    </NuxtLink>
  </nav>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  font-weight: 700;
}
.language-switcher:hover {
  text-decoration-thickness: 2px;
}
</style>
