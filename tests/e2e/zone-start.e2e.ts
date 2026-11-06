import { expect, test } from '@playwright/test';

const DAM_LAT = '52.3731';
const SHARED = '/en/?lat=52.3731&lon=4.8926';

test.describe('start place from the device time zone', () => {
  test.describe('America/New_York', () => {
    test.use({ timezoneId: 'America/New_York' });

    test('a bare URL starts near New York and stays bare', async ({ page }) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await page.goto('/en/');
      await expect(page.getByLabel('Latitude')).toHaveValue(/^40\./);
      // WHY: real wait past the 300 ms write debounce; a URL write would land here
      await page.waitForTimeout(600);
      expect(page.url()).not.toContain('lat=');
      expect(errors).toEqual([]);
    });

    test('a URL with lat and lon keeps its place', async ({ page }) => {
      await page.goto(SHARED);
      await expect(page.getByLabel('Latitude')).toHaveValue(DAM_LAT);
    });
  });

  for (const timezoneId of ['Europe/Amsterdam', 'UTC']) {
    test.describe(timezoneId, () => {
      test.use({ timezoneId });

      test('a bare URL keeps the Dam Square start place', async ({ page }) => {
        await page.goto('/en/');
        await expect(page.getByLabel('Latitude')).toHaveValue(DAM_LAT);
        await page.waitForTimeout(600);
        await expect(page.getByLabel('Latitude')).toHaveValue(DAM_LAT);
      });
    });
  }
});
