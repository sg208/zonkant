<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="shell">
    <a href="#main" class="skip-link">{{ t('shell.skip') }}</a>
    <AppHeader is-overlay />
    <main id="main" tabindex="-1" class="shell__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}
.shell__main {
  height: 100%;
}
.shell__main:focus {
  outline: none;
}
</style>
