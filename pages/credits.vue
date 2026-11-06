<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: computed(() => `${t('credits.title')} - Zonkant`),
  meta: [
    { name: 'description', content: computed(() => t('credits.description')) },
  ],
});

interface Credit {
  name: string;
  href: string;
  noteKey: string;
}

const credits: Credit[] = [
  {
    name: 'OpenStreetMap contributors',
    href: 'https://www.openstreetmap.org/copyright',
    noteKey: 'osm',
  },
  {
    name: 'OpenMapTiles',
    href: 'https://www.openmaptiles.org/',
    noteKey: 'openMapTiles',
  },
  {
    name: 'OpenFreeMap',
    href: 'https://openfreemap.org',
    noteKey: 'openFreeMap',
  },
  {
    name: 'Photon',
    href: 'https://photon.komoot.io',
    noteKey: 'photon',
  },
  {
    name: 'IANA Time Zone Database',
    href: 'https://www.iana.org/time-zones',
    noteKey: 'iana',
  },
  {
    name: 'OpenLayers',
    href: 'https://openlayers.org/',
    noteKey: 'openLayers',
  },
  {
    name: 'ol-mapbox-style',
    href: 'https://github.com/openlayers/ol-mapbox-style',
    noteKey: 'olMapboxStyle',
  },
  {
    name: 'suncalc',
    href: 'https://github.com/mourner/suncalc',
    noteKey: 'suncalc',
  },
  {
    name: 'TikTok Sans',
    href: 'https://github.com/tiktok/TikTokSans',
    noteKey: 'tiktokSans',
  },
  { name: 'Nuxt', href: 'https://nuxt.com', noteKey: 'nuxt' },
  { name: 'Vue', href: 'https://vuejs.org', noteKey: 'vue' },
  {
    name: 'Nuxt I18n',
    href: 'https://i18n.nuxtjs.org',
    noteKey: 'nuxtI18n',
  },
];
</script>

<template>
  <LegalPage :title="t('credits.title')" :lead="t('credits.lead')">
    <h2>{{ t('credits.heading') }}</h2>
    <ul class="credits">
      <li v-for="credit in credits" :key="credit.name" class="credit">
        <a :href="credit.href">{{ credit.name }}</a
        >. {{ t(`credits.items.${credit.noteKey}`) }}
      </li>
    </ul>

    <h2>{{ t('credits.licences.heading') }}</h2>
    <i18n-t keypath="credits.licences.body" tag="p">
      <template #notices>
        <a href="/THIRD-PARTY-NOTICES.txt">THIRD-PARTY-NOTICES.txt</a>
      </template>
    </i18n-t>
  </LegalPage>
</template>
