<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="shell">
    <a href="#main" class="skip-link">{{ t('shell.skip') }}</a>
    <AppHeader />
    <main id="main" tabindex="-1" class="shell__main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.shell__main {
  flex: 1;
}
.shell__main:focus {
  outline: none;
}
</style>
