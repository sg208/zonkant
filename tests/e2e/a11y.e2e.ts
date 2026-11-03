import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/privacy', '/terms', '/accessibility', '/credits']) {
  test(`${path} has no serious or critical axe violations`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { level: 1 }).first()
    ).toBeAttached();
    if (path === '/') {
      // The toggle only exists on the mobile sheet; the desktop panel is always open
      const toggle = page.getByRole('button', { name: 'More' });
      if (await toggle.isVisible()) await toggle.click();
    }
    const results = await new AxeBuilder({ page })
      .exclude('.ol-viewport')
      .analyze();
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
    );
    expect(
      serious.map((violation) => `${violation.id}: ${violation.nodes[0]?.html}`)
    ).toEqual([]);
  });
}
