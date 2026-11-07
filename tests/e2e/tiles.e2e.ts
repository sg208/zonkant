import { expect, test } from '@playwright/test';

// Real network: OpenFreeMap must answer. Retries come from playwright.config.
test('map tiles load from tiles.openfreemap.org', async ({ page }) => {
  const tile = page.waitForResponse(
    (response) =>
      response.url().startsWith('https://tiles.openfreemap.org/') &&
      response.status() === 200,
    { timeout: 15_000 }
  );
  await page.goto('/en/');
  await tile;
  await expect(page.locator('.ol-viewport canvas').first()).toBeAttached();
});

// Privacy page promise: only the page host and OpenFreeMap are contacted.
test('page contacts no host besides itself and tiles.openfreemap.org', async ({
  page,
  baseURL,
}) => {
  const hosts = new Set<string>();
  page.on('request', (request) => {
    const { protocol, host } = new URL(request.url());
    if (protocol === 'http:' || protocol === 'https:') hosts.add(host);
  });
  await page.goto('/en/?date=2026-06-21&time=16:00');
  await page.waitForLoadState('networkidle');
  // WHY: ol-mapbox-style injects font <link>s asynchronously after the style loads.
  await page.waitForTimeout(2000);
  const allowed = new Set([new URL(baseURL!).host, 'tiles.openfreemap.org']);
  expect([...hosts].filter((host) => !allowed.has(host))).toEqual([]);
});
