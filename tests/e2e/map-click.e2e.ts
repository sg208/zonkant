import { expect, test } from '@playwright/test';

test('clicking the map moves the selected point and the URL', async ({
  page,
}) => {
  await page.goto('/en/?lat=52.3731&lon=4.8926&date=2026-06-21&time=12:00');
  // The marker overlay exists once the map is built, so its click handler is attached
  await expect(page.getByRole('img', { name: 'Selected point' })).toBeVisible();
  const canvas = page.locator('.ol-viewport canvas').first();
  await expect(canvas).toBeAttached();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('map canvas has no box');
  // Clear of the side panel (desktop), the bottom sheet (mobile), the zoom buttons and the marker
  // WHY: the map resizes and recentres once the sheet height is measured; retry until a click lands
  await expect(async () => {
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.3);
    await expect(page).not.toHaveURL(/lat=52\.3731&lon=4\.8926/, {
      timeout: 2_000,
    });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByRole('img', { name: 'Selected point' })).toBeVisible();
});
