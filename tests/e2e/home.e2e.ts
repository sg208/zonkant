import { expect, test } from '@playwright/test';

test.describe('home', () => {
  test('shows the Amsterdam defaults and a sun readout', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zonkant' })
    ).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
    await expect(page.getByLabel('Latitude')).toHaveValue('52.3731');
    await expect(page.getByLabel('Longitude')).toHaveValue('4.8926');
    await expect(page.getByText('Europe/Amsterdam').first()).toBeAttached();
  });

  test('legal pages open from the home link row', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'More' });
    if (await toggle.isVisible()) await toggle.click();
    const nav = page.getByRole('navigation', { name: 'Legal' });
    await nav.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Privacy'
    );
  });

  // Night readouts are the widest strings the panel shows; 359° NNW is the longest bearing
  for (const [label, url] of [
    ['-45.0° 44° NE', '/?lat=52.3731&lon=4.8926&date=2026-11-03&time=02:26'],
    [
      'night with a long bearing',
      '/?lat=52.3731&lon=4.8926&date=2026-06-21&time=00:05',
    ],
  ] as const) {
    test(`readouts stay inside the panel and apart (${label})`, async ({
      page,
    }) => {
      await page.goto(url);
      const toggle = page.getByRole('button', { name: 'More' });
      if (await toggle.isVisible()) await toggle.click();
      const panel = page.locator('.sun-panel');
      await expect(panel).toBeVisible();
      const boxes = await panel
        .locator('.sun-panel__big')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
              scrollWidth: node.scrollWidth,
              clientWidth: node.clientWidth,
              lines: Math.round(rect.height / parseFloat(style.lineHeight)),
            };
          })
        );
      const panelBox = await panel.boundingBox();
      if (!panelBox) throw new Error('missing panel');
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(panelBox.x - 1);
        expect(box.right).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
        expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
        expect(box.lines).toBe(1);
      }
      for (const [i, a] of boxes.entries())
        for (const b of boxes.slice(i + 1)) {
          const isApart =
            a.right <= b.left ||
            b.right <= a.left ||
            a.bottom <= b.top ||
            b.bottom <= a.top;
          expect(isApart).toBe(true);
        }
    });
  }

  test('zoom buttons are not covered by anything else', async ({ page }) => {
    await page.goto('/');
    for (const selector of ['.ol-zoom-in', '.ol-zoom-out']) {
      const button = page.locator(selector);
      await expect(button).toBeVisible();
      const isOnTop = await button.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        return hit === node || node.contains(hit);
      });
      expect(isOnTop, selector).toBe(true);
    }
  });

  test('every attribution link is visible and clickable', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('.sun-map__attribution a');
    await expect(links).toHaveCount(3);
    const results = await links.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getClientRects()[0] ?? node.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
        return {
          isOnTop: hit === node || node.contains(hit),
          isInView: rect.left >= 0 && rect.right <= window.innerWidth,
        };
      })
    );
    for (const result of results)
      expect(result).toEqual({ isOnTop: true, isInView: true });
  });

  test('page title is phone-sized and panel labels are plain sentence case', async ({
    page,
  }) => {
    await page.goto('/');
    const h1 = await page
      .getByRole('heading', { level: 1, name: 'Zonkant' })
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(h1).toBeGreaterThanOrEqual(20);
    expect(h1).toBeLessThanOrEqual(24);
    const toggle = page.getByRole('button', { name: 'More' });
    if (await toggle.isVisible()) await toggle.click();
    for (const name of ['Sun right now', 'Today']) {
      const style = await page
        .getByRole('heading', { name, exact: true })
        .evaluate((node) => {
          const css = getComputedStyle(node);
          return {
            transform: css.textTransform,
            spacing: css.letterSpacing,
            size: parseFloat(css.fontSize),
          };
        });
      expect(style).toEqual({ transform: 'none', spacing: 'normal', size: 16 });
    }
  });
});
