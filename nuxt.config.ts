// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  app: {
    head: {
      // viewport-fit=cover lets the sheet pad itself with safe-area insets
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
    },
  },

  modules: ['@nuxt/eslint', '@nuxtjs/i18n'],

  // Dutch at /, English under /en. No cookie and no stored locale: the only
  // detection is the inline script in utils/langRedirect.ts
  i18n: {
    baseUrl: 'https://zonkant.engg.app',
    defaultLocale: 'nl',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
    // WHY: embed the page's messages in the HTML so hydration does not wait on a
    // messages.json request; keep all keys (map and error strings render client-side only)
    experimental: { preload: true, stripMessagesPayload: false },
    locales: [
      {
        code: 'nl',
        language: 'nl-NL',
        name: 'Nederlands',
        file: 'nl.ts',
      },
      {
        code: 'en',
        language: 'en-GB',
        name: 'English',
        file: 'en.ts',
      },
    ],
  },

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
      routes: [
        '/',
        '/privacy',
        '/terms',
        '/accessibility',
        '/credits',
        '/sky',
        '/en',
        '/en/privacy',
        '/en/terms',
        '/en/accessibility',
        '/en/credits',
        '/en/sky',
      ],
    },
  },
});
