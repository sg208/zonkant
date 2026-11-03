<script setup lang="ts">
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;

useHead({
  title: 'Terms - Zonkant',
  meta: [
    {
      name: 'description',
      content:
        'The code is MIT licensed. Sun times and shadows are estimates. Map data is ODbL.',
    },
  ],
});
</script>

<template>
  <LegalPage
    title="Terms"
    lead="Zonkant is a free, open-source sun and shadow planner. Treat what it shows as a good estimate, not a guarantee."
  >
    <h2>The code</h2>
    <p>
      The source code is released under the MIT licence. You may use, copy and
      change it, as long as you keep the licence notice. It comes with no
      warranty. The full text is in the
      <a :href="`${repoUrl}/blob/main/LICENSE`">LICENSE file</a>.
    </p>

    <h2>Estimates only</h2>
    <p>
      Sun positions and times are calculated for flat ground with no buildings,
      trees or hills, and are shown in your device's time zone. Real light and
      shade will differ. Zonkant is not safety-critical: do not use it for
      navigation, aviation, solar installation sizing or anything else where an
      error could cause harm.
    </p>
    <p>Never look straight at the sun.</p>

    <h2>Map data</h2>
    <p>
      Map data is from OpenStreetMap contributors under the
      <a href="https://www.openstreetmap.org/copyright">ODbL</a>. Map tiles are
      made by OpenFreeMap from OpenMapTiles, under the
      <a href="https://openfreemap.org/tos/">OpenFreeMap terms</a> and the
      <a href="https://www.openmaptiles.org/">OpenMapTiles</a> terms. See the
      <NuxtLink to="/credits">credits</NuxtLink> for everything this site is
      built on.
    </p>

    <h2>Your data</h2>
    <p>
      See the <NuxtLink to="/privacy">privacy page</NuxtLink>: nothing about you
      is collected.
    </p>

    <h2>Questions</h2>
    <p>Open an issue on <a :href="issuesUrl">GitHub</a>.</p>
  </LegalPage>
</template>
