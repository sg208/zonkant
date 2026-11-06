import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const QUERY = 'lat=48.1&lon=11.5&date=2026-06-21&time=12:00';
// The address may or may not percent-encode the colon of the time
const QUERY_PATTERN = QUERY.replaceAll('.', '\\.').replace(':', '(%3A|:)');
const ENGLISH_STRINGS = [
  'Sun below the horizon',
  'Source on GitHub',
  'Locate me',
];

const openMore = async (page: Page): Promise<void> => {
  const toggle = page.getByRole('button', { name: /^(More|Meer)$/ });
  if (await toggle.isVisible()) await toggle.click();
};

// Logs a paint on any Dutch document into window.name, which survives the
// same-tab navigation to /en/. A redirect that flashes Dutch would leave it set.
const trackDutchPaint = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    if (location.pathname.startsWith('/en')) return;
    window.name = 'dutch-seen';
    new PerformanceObserver((list) => {
      if (list.getEntries().length > 0) window.name = 'dutch-painted';
    }).observe({ type: 'paint', buffered: true });
  });
};

test.describe('Dutch visitors', () => {
  test.use({ locale: 'nl-NL' });

  test('D-6a nl-NL stays on / in Dutch', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zonkant');
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    await expect(page).toHaveURL(/localhost:4312\/$/);
    await openMore(page);
    // Dutch strings are present, so the absent English ones are not a vacuous miss
    await expect(
      page.getByRole('button', { name: 'Mijn locatie' })
    ).toBeVisible();
    await expect(page.getByLabel('Breedtegraad')).toBeVisible();
    for (const english of ENGLISH_STRINGS) {
      await expect(page.getByText(english)).toHaveCount(0);
    }
  });

  test('D-6d nl-BE is not redirected either', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: 'nl-BE', baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    await expect(page).toHaveURL(/localhost:4312\/$/);
    await context.close();
  });
});

test.describe('English visitors', () => {
  test.use({ locale: 'en-US' });

  test('D-6b redirects to /en/ with the query and never paints Dutch', async ({
    page,
  }) => {
    await trackDutchPaint(page);
    await page.goto(`/?${QUERY}`);
    await expect(page).toHaveURL(new RegExp(`/en/\\?${QUERY_PATTERN}$`));
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
    await openMore(page);
    await expect(page.getByRole('button', { name: 'Locate me' })).toBeVisible();
    expect(await page.evaluate(() => window.name)).not.toBe('dutch-painted');
  });

  test('D-6b control: the paint probe does fire on a Dutch page', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: 'nl-NL', baseURL });
    const page = await context.newPage();
    await trackDutchPaint(page);
    await page.goto('/');
    await expect
      .poll(() => page.evaluate(() => window.name), { timeout: 10_000 })
      .toBe('dutch-painted');
    await context.close();
  });

  test('D-6b keeps path, query and hash for other pages', async ({ page }) => {
    await page.goto('/privacy?lat=1#top');
    await expect(page).toHaveURL(/\/en\/privacy\?lat=1#top$/);
  });

  test('D-6c the Nederlands link switches, keeps the query and survives reload', async ({
    page,
  }) => {
    await page.goto(`/en/?${QUERY}`);
    await page.getByRole('link', { name: 'Nederlands' }).click();
    await expect(page).toHaveURL(
      new RegExp(`localhost:4312/\\?${QUERY_PATTERN}$`)
    );
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    await page.reload();
    await expect(page).toHaveURL(
      new RegExp(`localhost:4312/\\?${QUERY_PATTERN}$`)
    );
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zonkant');
  });

  test('D-6e only a same-origin referrer suppresses the redirect', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/', { referer: 'https://example.com/somewhere' });
    await expect(page).toHaveURL(/\/en\/$/);

    await page.goto('/', { referer: `${baseURL}/en/privacy` });
    await expect(page).toHaveURL(/localhost:4312\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
  });

  test('D-6f switching language stores nothing', async ({ page, context }) => {
    await page.goto('/en/');
    await page.getByRole('link', { name: 'Nederlands' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', /^nl/);
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', /^en/);
    expect(await context.cookies()).toEqual([]);
    const stored = await page.evaluate(
      () => window.localStorage.length + window.sessionStorage.length
    );
    expect(stored).toBe(0);
  });

  test('D-6g the switcher is reachable by keyboard and named in its own language', async ({
    page,
  }) => {
    await page.goto('/en/');
    const switcher = page.getByRole('link', { name: 'Nederlands' });
    await expect(switcher).toHaveAttribute('lang', 'nl');
    await expect(switcher).toHaveAttribute('hreflang', 'nl');
    await expect(
      page.getByRole('navigation', { name: 'Language' })
    ).toBeVisible();

    await page.getByRole('link', { name: 'Skip to content' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Zonkant' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(switcher).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL(/\/en/);

    const back = page.getByRole('link', { name: 'English' });
    await expect(back).toHaveAttribute('lang', 'en');
    await expect(back).toHaveAttribute('hreflang', 'en');
    await expect(page.getByRole('navigation', { name: 'Taal' })).toBeVisible();
  });

  test('D-6i URL state works under /en and survives reload', async ({
    page,
  }) => {
    await page.goto('/en/');
    const slider = page.getByRole('slider');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/\/en\/?\?.*lat=/);
    const expected = await slider.getAttribute('aria-valuetext');
    await page.reload();
    await expect(page).toHaveURL(/\/en\/?\?.*lat=/);
    await expect(page.getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      expected ?? ''
    );
  });

  test('D-6j unknown paths are real 404s in the matching language', async ({
    browser,
    baseURL,
  }) => {
    const dutch = await browser.newContext({ locale: 'nl-NL', baseURL });
    const dutchPage = await dutch.newPage();
    const dutchResponse = await dutchPage.goto('/nope');
    expect(dutchResponse?.status()).toBe(404);
    await expect(dutchPage.getByRole('heading', { level: 1 })).toHaveText(
      'Pagina niet gevonden'
    );
    await dutch.close();

    const englishPage = await (
      await browser.newContext({
        locale: 'en-US',
        baseURL,
      })
    ).newPage();
    const englishResponse = await englishPage.goto('/en/nope');
    expect(englishResponse?.status()).toBe(404);
    await expect(englishPage.getByRole('heading', { level: 1 })).toHaveText(
      'Page not found'
    );
    await expect(englishPage.locator('html')).toHaveAttribute('lang', /^en/);
  });
});

test.describe('D-6h accessibility in both languages', () => {
  test.use({ locale: 'nl-NL' });

  for (const path of ['/', '/en/', '/privacy', '/en/privacy', '/credits']) {
    test(`${path} has no axe violations`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { level: 1 }).first()
      ).toBeAttached();
      await openMore(page);
      const results = await new AxeBuilder({ page })
        .exclude('.ol-viewport')
        .analyze();
      expect(
        results.violations.map(
          (violation) => `${violation.id}: ${violation.nodes[0]?.html}`
        )
      ).toEqual([]);
    });
  }
});
