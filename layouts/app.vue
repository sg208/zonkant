<template>
  <div class="shell">
    <a href="#main" class="skip-link">Skip to content</a>
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
