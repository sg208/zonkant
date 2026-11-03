import { expect, test } from '@playwright/test';

const PAGES = [
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/accessibility', 'Accessibility'],
  ['/credits', 'Credits'],
] as const;

for (const [path, title] of PAGES) {
  test(`${path} renders one h1`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
  });
}

test('an unknown path is a real 404', async ({ page }) => {
  const response = await page.goto('/nope-not-here');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
