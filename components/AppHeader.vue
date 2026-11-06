<script setup lang="ts">
interface Props {
  // Compact wordmark floating over the full-screen map
  isOverlay?: boolean;
}

withDefaults(defineProps<Props>(), { isOverlay: false });

const localePath = useLocalePath();
</script>

<template>
  <header :class="['site-header', { 'site-header--overlay': isOverlay }]">
    <NuxtLink :to="localePath('/')" class="site-header__mark">Zonkant</NuxtLink>
    <LanguageSwitcher />
  </header>
</template>

<style scoped>
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--safe-top) calc(var(--margin) + var(--safe-right)) 0
    calc(var(--margin) + var(--safe-left));
}
.site-header__mark {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  font-weight: 800;
  text-decoration: none;
}
.site-header__mark:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
}
.site-header--overlay {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 10;
  padding: 0 var(--space-3);
  background: var(--ground);
  border: 2px solid var(--ink);
}
</style>
