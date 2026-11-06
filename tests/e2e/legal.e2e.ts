import { expect, test } from '@playwright/test';

const PAGES = [
  ['/en/privacy', 'Privacy'],
  ['/en/terms', 'Terms'],
  ['/en/accessibility', 'Accessibility'],
  ['/en/credits', 'Credits'],
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
  const response = await page.goto('/en/nope-not-here');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});

// Dutch legal set: the locale keeps the first-visit script from redirecting to /en/
test.describe('Dutch legal pages', () => {
  test.use({ locale: 'nl-NL' });

  const DUTCH_PAGES = [
    ['/privacy', 'Privacy'],
    ['/terms', 'Voorwaarden'],
    ['/accessibility', 'Toegankelijkheid'],
    ['/credits', 'Bronnen'],
  ] as const;

  for (const [path, title] of DUTCH_PAGES) {
    test(`${path} renders one Dutch h1`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    });
  }

  test('the Dutch privacy page keeps its promises', async ({ page }) => {
    await page.goto('/privacy');
    const text = await page.locator('main').innerText();
    expect(text).toContain('Geen cookies');
    expect(text).toContain('blijft op je apparaat');
    expect(text).toContain('De zoektekst die je typt wordt');
  });

  test('the English privacy page keeps its promises', async ({ page }) => {
    await page.goto('/en/privacy');
    const text = await page.locator('main').innerText();
    expect(text).toContain('No cookies');
    expect(text).toContain('stays on your device');
    expect(text).toContain('The search text you type is sent to');
  });
});
