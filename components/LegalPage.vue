<script setup lang="ts">
interface Props {
  title: string;
  lead: string;
}

defineProps<Props>();
</script>

<template>
  <div class="legal">
    <header>
      <h1 class="legal__title">{{ title }}</h1>
      <p class="legal__updated">Updated 4 November 2026</p>
    </header>
    <div class="legal__body">
      <p class="legal__lead">{{ lead }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.legal {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5) calc(var(--margin) + var(--safe-right)) var(--space-5)
    calc(var(--margin) + var(--safe-left));
}
.legal__title {
  font-size: clamp(2rem, 9vw, 5rem);
  font-weight: 800;
  line-height: var(--leading-display);
}
.legal__updated {
  margin-top: var(--space-3);
  color: var(--ink-soft);
}
.legal__lead {
  max-width: 40ch;
  font-size: 1.375rem;
  line-height: 1.35;
}
.legal__body :deep(h2) {
  margin-top: var(--space-5);
  font-size: 1.375rem;
  font-weight: 800;
  line-height: 1.2;
}
.legal__body :deep(p),
.legal__body :deep(ul) {
  margin-top: var(--space-2);
  max-width: 65ch;
}
.legal__body :deep(ul) {
  padding-left: 1.25rem;
  list-style: disc;
}
.legal__body :deep(li + li) {
  margin-top: var(--space-2);
}
.legal__body :deep(a) {
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}
</style>
