<script setup lang="ts">
const { repoUrl } = useAppConfig();
const issuesUrl = `${repoUrl}/issues`;

useHead({
  title: 'Privacy - Zonkant',
  meta: [
    {
      name: 'description',
      content:
        'Zonkant sets no cookies, has no tracking and stores nothing in your browser. Your location stays on your device.',
    },
  ],
});
</script>

<template>
  <LegalPage
    title="Privacy"
    lead="Zonkant does not collect anything about you. It has no accounts, no cookies and no tracking."
  >
    <h2>What stays on your device</h2>
    <p>
      No cookies. There is no storage either: nothing is saved in your browser's
      local or session storage, and nothing is remembered when you close the
      page.
    </p>

    <h2>Your location</h2>
    <p>
      Your position is read only when you press "Locate me", and only once. It
      stays on your device: it is never sent to this site or to anyone else. You
      can also type coordinates or tap the map instead.
    </p>
    <p>
      The place and time you pick are written into the address of the page (for
      example <code>?lat=52.37&amp;lon=4.89</code>) so you can bookmark or share
      the view. Whoever you give that address to can see those coordinates.
    </p>

    <h2>Who your browser talks to</h2>
    <p>
      The map loads straight from OpenFreeMap, so it can see your IP address, as
      with any website:
    </p>
    <ul>
      <li>
        tiles.openfreemap.org supplies the map style, tiles, sprites and glyphs.
        It receives the area of the map you look at.
      </li>
      <li>Cloudflare hosts this site and delivers its files.</li>
    </ul>
    <p>
      Sun positions are calculated in your browser. Fonts and icons are served
      from this site, not from a third party.
    </p>

    <h2>Tracking</h2>
    <p>
      There is no tracking: no visitor counting, no advertising and no
      fingerprinting.
    </p>

    <h2>Questions</h2>
    <p>
      Open an issue on <a :href="issuesUrl">GitHub</a> and the author will reply
      there.
    </p>
  </LegalPage>
</template>
