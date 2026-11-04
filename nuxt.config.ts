// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      // viewport-fit=cover lets the sheet pad itself with safe-area insets
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
    },
  },

  modules: ['@nuxt/eslint'],

  // Self-hosted variable font; no remote font provider
  css: ['@fontsource-variable/tiktok-sans/wdth.css', '~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  vite: {
    build: {
      sourcemap: false,
    },
  },

  // Server-render 404.html with error.vue instead of an empty SPA shell
  experimental: {
    prerenderErrorPages: true,
    // Legal pages are rarely visited: prefetch on hover/focus, not on scroll-into-view
    defaults: {
      nuxtLink: {
        prefetchOn: { visibility: false, interaction: true },
      },
    },
  },

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/', '/privacy', '/terms', '/accessibility', '/credits'],
    },
  },
});
