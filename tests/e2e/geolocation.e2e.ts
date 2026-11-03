import { expect, test } from '@playwright/test';

const openMore = async (
  page: import('@playwright/test').Page
): Promise<void> => {
  const toggle = page.getByRole('button', { name: 'More' });
  if (await toggle.isVisible()) await toggle.click();
};

test.describe('geolocation', () => {
  test.describe('granted', () => {
    test.use({
      permissions: ['geolocation'],
      geolocation: { latitude: 51.9244, longitude: 4.4777 },
    });

    test('Locate me moves the place to Rotterdam', async ({ page }) => {
      await page.goto('/');
      await openMore(page);
      await page.getByRole('button', { name: /locate me/i }).click();
      await expect(page.getByLabel('Latitude')).toHaveValue('51.9244');
      await expect(page.getByLabel('Longitude')).toHaveValue('4.4777');
    });
  });

  test.describe('denied', () => {
    test.use({ permissions: [] });

    test('shows a message and the page stays usable', async ({ page }) => {
      await page.goto('/');
      await openMore(page);
      await page.getByRole('button', { name: /locate me/i }).click();
      await expect(
        page.getByRole('status').filter({ hasText: /denied/i })
      ).toBeVisible();
      await page.getByLabel('Latitude').fill('48.85');
      await page.getByLabel('Latitude').blur();
      await expect(page.getByLabel('Latitude')).toHaveValue('48.85');
    });
  });
});
