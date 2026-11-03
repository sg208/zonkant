import { expect, test } from '@playwright/test';

const readAltitude = async (
  page: import('@playwright/test').Page
): Promise<number> => {
  const text = await page.locator('.sun-panel__big').first().textContent();
  return Number.parseFloat(text ?? '');
};

const openMore = async (
  page: import('@playwright/test').Page
): Promise<void> => {
  const toggle = page.getByRole('button', { name: 'More' });
  if (await toggle.isVisible()) await toggle.click();
};

test.describe('url state', () => {
  test('a shared URL reproduces the altitude', async ({ page }) => {
    await page.goto('/?lat=52.3731&lon=4.8926&date=2026-06-21&time=13:37');
    await openMore(page);
    // 90 - 52.37 + 23.44 = 61.07 at solar noon, 13:37 CEST is about 8 min past it
    expect(await readAltitude(page)).toBeGreaterThan(59);
    expect(await readAltitude(page)).toBeLessThan(63);
  });

  test('invalid params fall back without an error page', async ({ page }) => {
    await page.goto('/?lat=999&lon=abc&date=2026-02-30&time=25:00');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zonkant' })
    ).toHaveCount(1);
    await openMore(page);
    await expect(page.getByLabel('Latitude')).toHaveValue('52.3731');
    await expect(page.getByLabel('Longitude')).toHaveValue('4.8926');
  });

  test('keyboard on the slider changes the time and the URL', async ({
    page,
  }) => {
    await page.goto('/?lat=52.3731&lon=4.8926&date=2026-06-21&time=12:00');
    const slider = page.getByRole('slider');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuetext', '12:05');
    await expect(page).toHaveURL(/time=12(%3A|:)05/);
  });
});
