<script setup lang="ts">
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;

useHead({
  title: 'Accessibility - Zonkant',
  meta: [
    {
      name: 'description',
      content:
        'Zonkant aims to meet WCAG 2.2 level AA and works with a keyboard.',
    },
  ],
});
</script>

<template>
  <LegalPage
    title="Accessibility"
    lead="Zonkant aims to meet WCAG 2.2 level AA. Everyone should be able to find the sunny side."
  >
    <h2>What is in place</h2>
    <ul>
      <li>
        You can pick a place without the map: type latitude and longitude, or
        use "Locate me". The time is set with a date field and a slider that
        works with the arrow keys.
      </li>
      <li>
        Every control works with a keyboard, with a thick visible focus ring and
        targets of at least 44 pixels.
      </li>
      <li>A skip link jumps past the header to the main content.</li>
      <li>Text and sun lines have enough contrast against their background.</li>
      <li>
        The readout gives the sun's height, direction, key times and shadow
        length as text, and says so when the sun is below the horizon.
      </li>
      <li>
        Animation stops if your device asks for reduced motion, and the map
        zooms without animating.
      </li>
    </ul>

    <h2>Known limits</h2>
    <p>
      The map is a drawn canvas, so a screen reader cannot read it. The readout
      carries the same information as the lines on the map. Text is in English
      only, and map labels come from OpenStreetMap in the local language.
    </p>

    <h2>Last review</h2>
    <p>The author last checked this page on 3 November 2026.</p>

    <h2>Tell us about a barrier</h2>
    <p>
      If something does not work for you, open an issue on
      <a :href="issuesUrl">GitHub</a>. Say which page and which tool you used.
    </p>
  </LegalPage>
</template>
