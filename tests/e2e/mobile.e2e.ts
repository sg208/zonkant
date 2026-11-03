import { expect, test } from '@playwright/test';

test.describe('mobile layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'Pixel 7 project only');

  test('fits the viewport with 44 px targets and the point above the sheet', async ({
    page,
  }) => {
    await page.goto('/?lat=52.3731&lon=4.8926&date=2026-06-21&time=12:00');
    await expect(page.locator('.ol-viewport canvas').first()).toBeAttached();

    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.inner);

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/
    );

    const slider = await page.getByRole('slider').boundingBox();
    expect(slider?.height ?? 0).toBeGreaterThanOrEqual(44);
    for (const name of ['More', 'Now']) {
      const box = await page
        .getByRole('button', { name, exact: true })
        .boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const viewport = page.viewportSize();
    const sheet = await page.locator('.sheet').boundingBox();
    if (!sheet || !viewport) throw new Error('missing sheet or viewport');
    expect(sheet.y).toBeGreaterThanOrEqual(0);
    expect(sheet.y + sheet.height).toBeLessThanOrEqual(viewport.height + 1);

    // View padding keeps the centred point in the part of the map the sheet does not cover
    await expect
      .poll(
        async () =>
          (
            await page
              .getByRole('img', { name: 'Selected point' })
              .boundingBox()
          )?.y ?? Infinity
      )
      .toBeLessThan(sheet.y);
    const marker = await page
      .getByRole('img', { name: 'Selected point' })
      .boundingBox();
    expect((marker?.y ?? Infinity) + (marker?.height ?? 0)).toBeLessThanOrEqual(
      sheet.y + 1
    );
  });
});
