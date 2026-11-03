import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4312';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'list',
  expect: { timeout: 15_000 },
  use: { baseURL, timezoneId: 'Europe/Amsterdam' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx serve@14.2.4 .output/public -l 4312',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
