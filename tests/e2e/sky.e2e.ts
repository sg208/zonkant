import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { getPosition } from 'suncalc';

const QUERY = 'lat=48.1&lon=11.5&date=2026-06-21&time=12:00';
const SKY_URL = `/en/sky?${QUERY}`;

const openMore = async (page: Page): Promise<void> => {
  const toggle = page.getByRole('button', { name: /^(More|Meer)$/ });
  if (await toggle.isVisible()) await toggle.click();
};

// Playwright forbids launchOptions inside a describe group, so the flags cover this
// whole file. The page tests never ask for a camera, so the fake one stays idle there.
test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
});

const axeViolations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.map(
    (violation) => `${violation.id}: ${violation.nodes[0]?.html}`
  );
};

const searchParamsOf = (href: string): URLSearchParams =>
  new URL(href, 'http://localhost').searchParams;

test.describe('sky page shell', () => {
  test('D-18 shows Beta, a status message and the times table without a camera', async ({
    page,
  }) => {
    await page.goto(SKY_URL);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Sky view');
    await expect(heading).toContainText('Beta');
    await expect(page.getByRole('status')).toContainText(
      'phone or tablet with a camera and a compass'
    );
    const table = page.getByRole('table');
    await expect(table.locator('caption')).toContainText('every full hour');
    await expect(
      table.getByRole('row', { name: /June solstice.*12:00/ })
    ).toBeVisible();
  });

  test('D-18 the sheet links to Sky view with the same place and moment', async ({
    page,
  }) => {
    await page.goto(`/en/?${QUERY}`);
    await openMore(page);
    const link = page
      .getByRole('navigation', { name: 'Legal' })
      .getByRole('link', { name: 'Sky view (Beta)' });
    // The prerendered link carries the default place until the page hydrates
    await expect(link).toHaveAttribute('href', /lat=48\.1/);
    const href = (await link.getAttribute('href')) ?? '';
    expect(href.startsWith('/en/sky')).toBe(true);
    const params = searchParamsOf(href);
    expect(params.get('lat')).toBe('48.1');
    expect(params.get('lon')).toBe('11.5');
    expect(params.get('date')).toBe('2026-06-21');
    expect(params.get('time')).toBe('12:00');
    await link.click();
    await expect(page).toHaveURL(/\/en\/sky\?/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beta');
  });
});

test.describe('sky page in Dutch', () => {
  test.use({ locale: 'nl-NL' });

  test('D-18 the Dutch link starts with /sky and the page is Dutch', async ({
    page,
  }) => {
    await page.goto(`/?${QUERY}`);
    await openMore(page);
    const link = page
      .getByRole('navigation', { name: 'Juridisch' })
      .getByRole('link', { name: 'Hemelzicht (bèta)' });
    await expect(link).toHaveAttribute('href', /lat=48\.1/);
    const href = (await link.getAttribute('href')) ?? '';
    expect(href.startsWith('/sky?')).toBe(true);
    expect(searchParamsOf(href).get('lat')).toBe('48.1');
    await link.click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Hemelzicht'
    );
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bèta');
    await expect(page.getByRole('table').locator('caption')).toContainText(
      'elk heel uur'
    );
  });
});

// Camera + compass. Chromium serves a fake camera; the compass is synthetic events.
// Munich at 12:00 on the summer solstice, with Date fixed so "the sun now" is known.
const FAKE_NOW = new Date('2026-06-21T12:00:00+02:00');
const SUN_COLOUR_FLOOR = {
  red: 240,
  greenMin: 195,
  greenMax: 230,
  blueMax: 60,
};

// suncalc 2.x reports degrees, azimuth clockwise from north
const sunNow = (): { bearingDeg: number; altitudeDeg: number } => {
  const { azimuth, altitude } = getPosition(FAKE_NOW, 48.1, 11.5);
  return { bearingDeg: azimuth, altitudeDeg: altitude };
};

const sendOrientation = async (
  page: Page,
  headingDeg: number,
  pitchDeg: number
): Promise<void> => {
  // Upright portrait device (beta 90) looks at the horizon; alpha counts anticlockwise
  await page.evaluate(
    ({ alpha, beta }) => {
      window.dispatchEvent(
        new DeviceOrientationEvent('deviceorientationabsolute', {
          alpha,
          beta,
          gamma: 0,
          absolute: true,
        })
      );
    },
    { alpha: (360 - headingDeg + 360) % 360, beta: 90 + pitchDeg }
  );
};

// Pixel probe on the overlay canvas: only the sun marker is painted in the sun colour
const probeCanvas = (
  page: Page
): Promise<{
  opaquePixels: number;
  sunCentreX: number | null;
  scale: number;
  centreX: number;
}> =>
  page.evaluate((floor) => {
    const canvas = document.querySelector('canvas');
    const context = canvas?.getContext('2d');
    // The canvas only exists once the camera is on
    if (!canvas || !context) {
      return { opaquePixels: 0, sunCentreX: null, scale: 1, centreX: 0 };
    }
    const { data, width, height } = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );
    let opaquePixels = 0;
    let sunPixels = 0;
    let sunXSum = 0;
    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const offset = (row * width + column) * 4;
        if ((data[offset + 3] ?? 0) === 0) continue;
        opaquePixels += 1;
        const isSun =
          (data[offset] ?? 0) >= floor.red &&
          (data[offset + 1] ?? 0) >= floor.greenMin &&
          (data[offset + 1] ?? 0) <= floor.greenMax &&
          (data[offset + 2] ?? 255) <= floor.blueMax &&
          data[offset + 3] === 255;
        if (!isSun) continue;
        sunPixels += 1;
        sunXSum += column;
      }
    }
    return {
      opaquePixels,
      sunCentreX: sunPixels > 20 ? sunXSum / sunPixels : null,
      scale: canvas.width / canvas.clientWidth,
      centreX: width / 2,
    };
  }, SUN_COLOUR_FLOOR);

test.describe('sky view with camera and compass', () => {
  test.use({ permissions: ['camera'] });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript((): void => {
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      ).requestPermission = async (): Promise<string> => 'granted';
      (window as unknown as { cspViolations: string[] }).cspViolations = [];
      document.addEventListener('securitypolicyviolation', (event): void => {
        (window as unknown as { cspViolations: string[] }).cspViolations.push(
          `${event.violatedDirective} ${event.blockedURI}`
        );
      });
    });
    await page.clock.setFixedTime(FAKE_NOW);
  });

  const startSky = async (page: Page): Promise<void> => {
    await page.goto(SKY_URL);
    await expect(page.getByRole('status')).toContainText('phone or tablet');
    await page.getByRole('button', { name: 'Start camera' }).click();
    const sun = sunNow();
    // Sent straight after the tap: the compass gives up after 1.5 s of silence.
    // The raw compass reads 12 degrees west of the truth, as a phone often does.
    await sendOrientation(page, sun.bearingDeg - 12, sun.altitudeDeg);
    await expect
      .poll(() =>
        page.evaluate(() => document.querySelector('video')?.srcObject !== null)
      )
      .toBe(true);
  };

  test('D-19 Start attaches the camera and draws the arcs on the canvas', async ({
    page,
  }) => {
    await startSky(page);
    await expect
      .poll(async () => (await probeCanvas(page)).opaquePixels, {
        message: 'canvas has painted pixels',
      })
      .toBeGreaterThan(500);
    await expect(page.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('video')).toHaveAttribute('playsinline', '');
  });

  test('D-20 no CSP violation and no request beyond the page origin', async ({
    page,
    baseURL,
  }) => {
    const csp = readFileSync('public/_headers', 'utf8')
      .split('\n')
      .find((line) => line.includes('Content-Security-Policy-Report-Only:'))
      ?.split('Report-Only:')[1]
      ?.trim();
    expect(csp).toBeTruthy();
    // The static test server ignores _headers, so apply the real policy here
    await page.route('**/*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          'content-security-policy-report-only': csp ?? '',
        },
      });
    });
    const requests: { host: string; method: string }[] = [];
    page.on('request', (request) => {
      const { protocol, host } = new URL(request.url());
      if (protocol === 'http:' || protocol === 'https:')
        requests.push({ host, method: request.method() });
    });
    await startSky(page);
    await expect
      .poll(async () => (await probeCanvas(page)).opaquePixels)
      .toBeGreaterThan(500);
    expect(requests.length).toBeGreaterThan(0);
    expect(new Set(requests.map((request) => request.host))).toEqual(
      new Set([new URL(baseURL ?? '').host])
    );
    expect(requests.filter((request) => request.method !== 'GET')).toEqual([]);
    expect(
      await page.evaluate(
        () => (window as unknown as { cspViolations: string[] }).cspViolations
      )
    ).toEqual([]);
  });

  const sunMarkerOffset = async (page: Page): Promise<number | null> => {
    const probe = await probeCanvas(page);
    if (probe.sunCentreX === null) return null;
    // CSS px right of the canvas centre
    return (probe.sunCentreX - probe.centreX) / probe.scale;
  };

  test('D-19 calibrating moves the sun marker onto the crosshair and nudges shift it', async ({
    page,
  }) => {
    await startSky(page);
    const wrapper = page.locator('.sky-canvas');
    await expect(wrapper).toHaveAttribute('data-calibrated', 'false');
    await expect(
      page.getByText(/compass may be off by 10° or more/i)
    ).toBeVisible();
    await expect.poll(() => sunMarkerOffset(page)).toBeGreaterThan(30);

    await page.getByRole('button', { name: 'Calibrate', exact: true }).click();
    await expect(wrapper).toHaveAttribute('data-calibrated', 'true');
    await expect(page.getByText(/compass may be off/i)).toHaveCount(0);
    await expect
      .poll(async () => Math.abs((await sunMarkerOffset(page)) ?? 999))
      .toBeLessThan(3);

    // Keyboard only: focus the button, then Enter / Space. +1 degree turns the view
    // right, so the sun moves left by about focal length x cos(altitude 64°) / 57
    // px: 3-14 px depending on the viewport.
    await page.getByRole('button', { name: /\+1°/ }).focus();
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => (await sunMarkerOffset(page)) ?? 999)
      .toBeLessThan(-2);
    expect((await sunMarkerOffset(page)) ?? 0).toBeGreaterThan(-25);
    await page.getByRole('button', { name: /[-−]1°/ }).focus();
    await page.keyboard.press('Space');
    await expect
      .poll(async () => Math.abs((await sunMarkerOffset(page)) ?? 999))
      .toBeLessThan(3);

    await page.getByRole('button', { name: 'Reset calibration' }).click();
    await expect(wrapper).toHaveAttribute('data-calibrated', 'false');
    await expect(
      page.getByText(/compass may be off by 10° or more/i)
    ).toBeVisible();
    await expect.poll(() => sunMarkerOffset(page)).toBeGreaterThan(30);
  });

  test('D-19 Calibrate is disabled with a visible reason when the sun is down', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date('2026-06-21T00:30:00+02:00'));
    await page.goto(SKY_URL);
    await page.getByRole('button', { name: 'Start camera' }).click();
    await sendOrientation(page, 90, 10);
    const calibrate = page.getByRole('button', {
      name: 'Calibrate',
      exact: true,
    });
    await expect(calibrate).toBeDisabled();
    await expect(page.getByText('The sun is below the horizon')).toBeVisible();
    await expect(calibrate).toHaveAccessibleDescription(/below the horizon/);
  });

  test('D-19 no control sits under the video or canvas', async ({ page }) => {
    await startSky(page);
    await expect(
      page.getByRole('button', { name: 'Calibrate', exact: true })
    ).toBeVisible();
    const controls = page.locator('.sky-canvas button, .sky-canvas input');
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(5);
    for (let index = 0; index < count; index += 1) {
      const control = controls.nth(index);
      await control.scrollIntoViewIfNeeded();
      const isOnTop = await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2
        );
        return hit === element || element.contains(hit);
      });
      expect(isOnTop, `control ${index}`).toBe(true);
    }
  });

  test('D-21 /en/sky has no axe violations once the camera is on', async ({
    page,
  }) => {
    await startSky(page);
    await expect(
      page.getByRole('group', { name: 'Calibration and view' })
    ).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });

  test('D-21 the table, canvas and controls have the accessible shape', async ({
    page,
  }) => {
    await startSky(page);
    const table = page.getByRole('table');
    await expect(table.locator('caption')).toHaveCount(1);
    expect(await table.locator('thead th[scope="col"]').count()).toBe(4);
    const rowHeaders = table.locator('tbody th');
    const rowCount = await rowHeaders.count();
    // Munich: 16 + 8+ + 16+ full hours with the sun up across the three arcs
    expect(rowCount).toBeGreaterThan(30);
    for (let index = 0; index < rowCount; index += 1) {
      await expect(rowHeaders.nth(index)).toHaveAttribute('scope', 'row');
    }
    await expect(
      table.getByRole('row', { name: /Selected date: 21 June 2026.*12:00/ })
    ).toHaveCount(1);
    await expect(
      table.getByRole('row', { name: /December solstice.*12:00.*°/ })
    ).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveAttribute('aria-hidden', 'true');
    for (const name of ['Calibrate', 'Heading +1°', 'Reset calibration']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
    await expect(page.getByLabel('Field of view')).toHaveAttribute('min', '40');
  });
});

test.describe('sky view in Dutch on a 320px screen', () => {
  test.use({
    locale: 'nl-NL',
    permissions: ['camera'],
    viewport: { width: 320, height: 640 },
  });

  test('D-19 Dutch controls wrap instead of overflowing', async ({ page }) => {
    await page.addInitScript((): void => {
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      ).requestPermission = async (): Promise<string> => 'granted';
    });
    await page.goto(`/sky?${QUERY}`);
    await page.getByRole('button', { name: 'Camera starten' }).click();
    await sendOrientation(page, 130, 60);
    const warning = page.getByText(/Het kompas kan 10° of meer afwijken/);
    await expect(warning).toBeVisible();
    const layout = await page.evaluate(() => {
      const scroller = document.querySelector('.sky') as HTMLElement;
      const rects = [
        ...document.querySelectorAll(
          '.sky-canvas button, .sky-canvas p, .sky-canvas label'
        ),
      ].map((element) => element.getBoundingClientRect());
      return {
        overflowsHorizontally: scroller.scrollWidth > scroller.clientWidth,
        rightmost: Math.max(...rects.map((rect) => rect.right)),
        warningHeight: (
          document.querySelector('.controls__message') as HTMLElement
        ).getBoundingClientRect().height,
      };
    });
    expect(layout.overflowsHorizontally).toBe(false);
    expect(layout.rightmost).toBeLessThanOrEqual(320);
    // Several lines tall: the long Dutch sentence wrapped (one line is ~24px)
    expect(layout.warningHeight).toBeGreaterThan(60);
  });

  test('D-21 /sky has no axe violations once the camera is on', async ({
    page,
  }) => {
    await page.addInitScript((): void => {
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      ).requestPermission = async (): Promise<string> => 'granted';
    });
    await page.goto(`/sky?${QUERY}`);
    await page.getByRole('button', { name: 'Camera starten' }).click();
    await sendOrientation(page, 130, 60);
    await expect(
      page.getByRole('group', { name: 'Kalibratie en weergave' })
    ).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
});
