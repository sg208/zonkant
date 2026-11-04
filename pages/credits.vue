<script setup lang="ts">
useHead({
  title: 'Credits - Zonkant',
  meta: [
    {
      name: 'description',
      content:
        'The map data, tiles, libraries and font that Zonkant is built on.',
    },
  ],
});

interface Credit {
  name: string;
  href: string;
  note: string;
}

const credits: Credit[] = [
  {
    name: 'OpenStreetMap contributors',
    href: 'https://www.openstreetmap.org/copyright',
    note: 'Map data, available under the Open Database Licence (ODbL).',
  },
  {
    name: 'OpenMapTiles',
    href: 'https://www.openmaptiles.org/',
    note: 'The vector tile schema the map is drawn from.',
  },
  {
    name: 'OpenFreeMap',
    href: 'https://openfreemap.org',
    note: 'Free hosting of the map tiles and the Positron style, without an API key.',
  },
  {
    name: 'Photon',
    href: 'https://photon.komoot.io',
    note: 'Place search, run by komoot on OpenStreetMap data under the ODbL.',
  },
  {
    name: 'OpenLayers',
    href: 'https://openlayers.org/',
    note: 'The map library. BSD 2-Clause licence.',
  },
  {
    name: 'ol-mapbox-style',
    href: 'https://github.com/openlayers/ol-mapbox-style',
    note: 'Applies the Positron style to OpenLayers. BSD 2-Clause licence.',
  },
  {
    name: 'suncalc',
    href: 'https://github.com/mourner/suncalc',
    note: 'Sun position and times, by Volodymyr Agafonkin. BSD 2-Clause licence.',
  },
  {
    name: 'TikTok Sans',
    href: 'https://github.com/tiktok/TikTokSans',
    note: 'The typeface, self-hosted through Fontsource. SIL Open Font Licence 1.1.',
  },
  {
    name: 'Nuxt',
    href: 'https://nuxt.com',
    note: 'The web framework. MIT licence.',
  },
  {
    name: 'Vue',
    href: 'https://vuejs.org',
    note: 'The UI library. MIT licence.',
  },
];
</script>

<template>
  <LegalPage
    title="Credits"
    lead="Zonkant stands on open data and open-source work. Thank you to everyone behind it."
  >
    <h2>Map and code</h2>
    <ul class="credits">
      <li v-for="credit in credits" :key="credit.name" class="credit">
        <a :href="credit.href">{{ credit.name }}</a
        >. {{ credit.note }}
      </li>
    </ul>

    <h2>Licence texts</h2>
    <p>
      The full copyright notices and licence texts are in
      <a href="/THIRD-PARTY-NOTICES.txt">THIRD-PARTY-NOTICES.txt</a>.
    </p>
  </LegalPage>
</template>
