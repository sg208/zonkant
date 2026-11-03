import { defineVitestConfig } from '@nuxt/test-utils/config';
import { fileURLToPath } from 'node:url';

// Sun times are asserted in Amsterdam time on any machine
process.env.TZ = 'Europe/Amsterdam';

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('.', import.meta.url)),
        domEnvironment: 'happy-dom',
        overrides: {
          ssr: false,
        },
      },
    },
  },
});
