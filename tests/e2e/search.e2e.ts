import { expect, test, type Page, type Route } from '@playwright/test';

const PHOTON = 'https://photon.komoot.io/**';
const CORS = { 'access-control-allow-origin': '*' };
const FIXTURE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.8642, 52.3081] },
      properties: {
        name: 'Amstelveen',
        state: 'North Holland',
        country: 'Netherlands',
        osm_key: 'place',
        osm_value: 'town',
        type: 'city',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [4.9, 52.37] },
      properties: { name: 'Amsterdam', country: 'Netherlands' },
    },
  ],
};

interface Counts {
  seen: number;
  fulfilled: number;
}

// Counts every Photon request and how many the mock answered; they must match
const mockPhoton = async (
  page: Page,
  answer: (route: Route) => Promise<void>
): Promise<Counts> => {
  const counts: Counts = { seen: 0, fulfilled: 0 };
  page.on('request', (request) => {
    if (request.url().startsWith('https://photon.komoot.io/')) counts.seen += 1;
  });
  await page.route(PHOTON, async (route) => {
    counts.fulfilled += 1;
    await answer(route);
  });
  return counts;
};

const openSearch = async (page: Page): Promise<void> => {
  await page.goto('/?lat=52.3731&lon=4.8926&date=2026-06-21&time=12:00');
  const toggle = page.getByRole('button', { name: 'More' });
  if (await toggle.isVisible()) await toggle.click();
  await expect(
    page.getByRole('combobox', { name: 'Search a place' })
  ).toBeVisible();
};

const respondWith =
  (body: unknown, status = 200) =>
  (route: Route): Promise<void> =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: CORS,
      body: JSON.stringify(body),
    });

test.describe('place search', () => {
  test('finds a place, moves the point and updates URL and inputs', async ({
    page,
  }) => {
    const counts = await mockPhoton(page, respondWith(FIXTURE));
    await openSearch(page);
    const box = page.getByRole('combobox', { name: 'Search a place' });
    // Fast burst: the 350 ms debounce must collapse it into one request
    await box.pressSequentially('amst', { delay: 30 });
    await expect(
      page.getByRole('status').filter({ hasText: '2 places found' })
    ).toBeVisible();
    await expect(page.getByRole('listbox')).toBeVisible();
    expect(counts.seen).toBe(1);

    await box.press('ArrowDown');
    await box.press('Enter');
    await expect(
      page.getByRole('status').filter({ hasText: 'Moved to Amstelveen' })
    ).toBeVisible();
    await expect(page).toHaveURL(/lat=52\.3081/);
    await expect(page).toHaveURL(/lon=4\.8642/);
    await expect(page.getByLabel('Latitude')).toHaveValue('52.3081');
    await expect(page.getByLabel('Longitude')).toHaveValue('4.8642');
    expect(counts.seen).toBe(counts.fulfilled);
  });

  test('the first option is not covered by anything else', async ({ page }) => {
    const counts = await mockPhoton(page, respondWith(FIXTURE));
    await openSearch(page);
    await page.getByRole('combobox', { name: 'Search a place' }).fill('amst');
    const option = page.getByRole('option').first();
    await expect(option).toBeVisible();
    await option.scrollIntoViewIfNeeded();
    const isOnTop = await option.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      return hit === node || node.contains(hit);
    });
    expect(isOnTop).toBe(true);
    expect(counts.seen).toBe(counts.fulfilled);
  });

  test('says when the service is unavailable and stays usable', async ({
    page,
  }) => {
    const counts = await mockPhoton(page, respondWith({}, 500));
    await openSearch(page);
    const box = page.getByRole('combobox', { name: 'Search a place' });
    await box.fill('amst');
    await expect(
      page.getByRole('status').filter({ hasText: 'Search is unavailable' })
    ).toBeVisible();
    await expect(box).toBeEditable();
    expect(counts.seen).toBe(counts.fulfilled);
  });

  test('says when nothing matches', async ({ page }) => {
    const counts = await mockPhoton(page, respondWith({ features: [] }));
    await openSearch(page);
    await page.getByRole('combobox', { name: 'Search a place' }).fill('zzzz');
    await expect(
      page.getByRole('status').filter({ hasText: 'No places found' })
    ).toBeVisible();
    expect(counts.seen).toBe(counts.fulfilled);
  });

  test('layout: the controls below the input never move', async ({ page }) => {
    let mode: 'results' | 'empty' | 'error' = 'results';
    const counts = await mockPhoton(page, (route) =>
      respondWith(
        mode === 'empty' ? { features: [] } : FIXTURE,
        mode === 'error' ? 500 : 200
      )(route)
    );
    await openSearch(page);
    const box = page.getByRole('combobox', { name: 'Search a place' });
    const latitude = page.getByLabel('Latitude');
    // fill() scrolls the input into view, so measure relative to the input
    const gap = async (): Promise<number> => {
      const inputBox = await box.boundingBox();
      const latBox = await latitude.boundingBox();
      return (latBox?.y ?? NaN) - (inputBox?.y ?? NaN);
    };
    const before = await gap();
    expect(before).toBeGreaterThan(0);

    await box.fill('amst');
    await expect(page.getByRole('listbox')).toBeVisible();
    const input = await box.boundingBox();
    const list = await page.getByRole('listbox').boundingBox();
    expect(list?.y ?? 0).toBeGreaterThanOrEqual(
      (input?.y ?? 0) + (input?.height ?? 0)
    );
    expect(await gap()).toBe(before);

    mode = 'empty';
    await box.fill('zzzz');
    await expect(page.locator('.search__popover')).toHaveText(
      'No places found'
    );
    expect(await gap()).toBe(before);

    mode = 'error';
    await box.fill('boom');
    await expect(page.locator('.search__popover')).toContainText(
      'Search is unavailable'
    );
    expect(await gap()).toBe(before);

    mode = 'results';
    await box.fill('amsterdam');
    await expect(page.getByRole('listbox')).toBeVisible();
    await box.press('ArrowDown');
    await box.press('Enter');
    await expect(
      page.getByRole('status').filter({ hasText: 'Moved to' })
    ).toBeAttached();
    await expect(page.getByRole('listbox')).toBeHidden();
    expect(await gap()).toBe(before);
    expect(counts.seen).toBe(counts.fulfilled);
  });
});
