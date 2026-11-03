<script setup lang="ts">
const { repoUrl } = useAppConfig();
const currentYear = new Date().getFullYear();

const siteLinks = [
  { to: '/accessibility', label: 'Accessibility' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/credits', label: 'Credits' },
] as const;
</script>

<template>
  <footer class="site-footer">
    <h2 class="visually-hidden">About this site</h2>

    <p class="site-footer__wordmark">Zonkant</p>
    <p class="site-footer__map">
      Map data from OpenStreetMap contributors, tiles by OpenFreeMap.
    </p>

    <nav aria-label="Footer">
      <ul class="site-footer__links">
        <li v-for="link in siteLinks" :key="link.to">
          <NuxtLink :to="link.to">{{ link.label }}</NuxtLink>
        </li>
        <li>
          <a :href="repoUrl" target="_blank" rel="noopener noreferrer">
            Source on GitHub
            <span class="visually-hidden">(opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </nav>

    <p class="site-footer__legal">
      © {{ currentYear }} Syailendra Ginting. MIT licence.
    </p>
  </footer>
</template>

<style scoped>
.site-footer {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-5) calc(var(--margin) + var(--safe-right))
    calc(var(--space-4) + var(--safe-bottom))
    calc(var(--margin) + var(--safe-left));
  background: var(--surface);
  border-top: 2px solid var(--ink);
}
.site-footer__wordmark {
  font-size: var(--text-readout);
  font-weight: 800;
  line-height: var(--leading-display);
}
.site-footer__map,
.site-footer__legal {
  max-width: 60ch;
  font-size: var(--text-small);
}
.site-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}
.site-footer__links a {
  display: inline-flex;
  align-items: center;
  min-height: var(--target);
  text-decoration-thickness: 2px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
