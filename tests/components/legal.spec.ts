import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import AccessibilityPage from '~/pages/accessibility.vue';
import CreditsPage from '~/pages/credits.vue';
import PrivacyPage from '~/pages/privacy.vue';
import TermsPage from '~/pages/terms.vue';

describe('Legal pages', () => {
  it.each([
    ['accessibility', AccessibilityPage, 'Accessibility'],
    ['credits', CreditsPage, 'Credits'],
    ['privacy', PrivacyPage, 'Privacy'],
    ['terms', TermsPage, 'Terms'],
  ])('%s page has one h1 and an Updated date', async (_, page, title) => {
    const wrapper = await mountSuspended(page);
    const headings = wrapper.findAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe(title);
    expect(wrapper.text()).toContain('Updated 4 November 2026');
  });

  it('privacy names the tile host and states the on-device promises', async () => {
    const text = (await mountSuspended(PrivacyPage)).text();
    expect(text).toContain('tiles.openfreemap.org');
    expect(text).toContain('stays on your device');
    expect(text).toContain('No cookies');
    expect(text).toContain('no storage');
    expect(text).toContain('Cloudflare');
  });

  it('privacy says the start place comes from the time zone and is never sent', async () => {
    const text = (await mountSuspended(PrivacyPage)).text();
    expect(text).toContain('time zone');
    expect(text).toContain('never sent');
  });

  it('privacy discloses that typed search text goes to Photon, not coordinates', async () => {
    const text = (await mountSuspended(PrivacyPage)).text();
    expect(text).toContain('photon.komoot.io');
    expect(text).toContain('The search text you type is sent to');
    expect(text).toContain(
      'Coordinates and your "Locate me" position are never sent'
    );
  });

  it('terms warns about estimates and the sun', async () => {
    const text = (await mountSuspended(TermsPage)).text();
    expect(text).toContain('MIT');
    expect(text).toContain('ODbL');
    expect(text).toContain('not safety-critical');
    expect(text).toContain('Never look straight at the sun');
  });

  it('accessibility states the WCAG target and the canvas limit', async () => {
    const text = (await mountSuspended(AccessibilityPage)).text();
    expect(text).toContain('WCAG 2.2');
    expect(text).toContain('screen reader');
  });

  it('credits lists every dependency with a link', async () => {
    const wrapper = await mountSuspended(CreditsPage);
    const entries = wrapper.findAll('li.credit');
    expect(entries.length).toBeGreaterThanOrEqual(10);
    for (const name of [
      'OpenStreetMap contributors',
      'OpenMapTiles',
      'OpenFreeMap',
      'OpenLayers',
      'ol-mapbox-style',
      'suncalc',
      'TikTok Sans',
      'Nuxt',
      'Vue',
      'Photon',
    ]) {
      const entry = entries.find((node) => node.text().includes(name));
      expect(entry, name).toBeDefined();
      expect(entry?.find('a[href^="http"]').exists(), name).toBe(true);
    }
    expect(wrapper.text()).toContain('ODbL');
    expect(wrapper.find('a[href="/THIRD-PARTY-NOTICES.txt"]').exists()).toBe(
      true
    );
  });
});

// Dutch pages. The test config makes en the default locale, so nl lives under /nl.
describe('Legal pages in Dutch', () => {
  const DUTCH = { route: '/nl' };

  it.each([
    ['accessibility', AccessibilityPage, 'Toegankelijkheid'],
    ['credits', CreditsPage, 'Bronnen'],
    ['privacy', PrivacyPage, 'Privacy'],
    ['terms', TermsPage, 'Voorwaarden'],
  ])('%s page has one Dutch h1 and a Dutch date', async (_, page, title) => {
    const wrapper = await mountSuspended(page, DUTCH);
    const headings = wrapper.findAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0]?.text()).toBe(title);
    expect(wrapper.text()).toContain('Bijgewerkt op 4 november 2026');
    expect(wrapper.text()).not.toContain('Updated');
  });

  it('privacy keeps the same promises in Dutch', async () => {
    const text = (await mountSuspended(PrivacyPage, DUTCH)).text();
    expect(text).toContain('tiles.openfreemap.org');
    expect(text).toContain('Geen cookies');
    expect(text).toContain('blijft op je apparaat');
    expect(text).toContain('photon.komoot.io');
    expect(text).toContain('De zoektekst die je typt wordt');
    expect(text).toContain('“Mijn locatie” worden er nooit naartoe gestuurd');
    expect(text).toContain('Cloudflare');
    expect(text).toContain('talenlijst');
  });

  it('terms warns about estimates and the sun in Dutch', async () => {
    const text = (await mountSuspended(TermsPage, DUTCH)).text();
    expect(text).toContain('MIT');
    expect(text).toContain('ODbL');
    expect(text).toContain('Kijk nooit recht in de zon');
  });

  it('accessibility states the WCAG target, the canvas limit and both languages', async () => {
    const text = (await mountSuspended(AccessibilityPage, DUTCH)).text();
    expect(text).toContain('WCAG 2.2');
    expect(text).toContain('schermlezer');
    expect(text).toContain('Nederlands en het Engels');
  });

  it('keeps links inside prose and under the Dutch route', async () => {
    const terms = await mountSuspended(TermsPage, DUTCH);
    const hrefs = Array.from(
      (terms.element as HTMLElement).querySelectorAll('a'),
      (link) => link.getAttribute('href')
    );
    expect(hrefs).toContain('/nl/credits');
    expect(hrefs).toContain('/nl/privacy');
    const privacy = await mountSuspended(PrivacyPage, DUTCH);
    expect(privacy.find('a[href$="/issues"]').text()).toBe('GitHub');
  });

  it('credits lists every dependency with a link', async () => {
    const wrapper = await mountSuspended(CreditsPage, DUTCH);
    const entries = wrapper.findAll('li.credit');
    expect(entries.length).toBeGreaterThanOrEqual(10);
    expect(wrapper.text()).toContain('Kaartgegevens');
    expect(wrapper.find('a[href="/THIRD-PARTY-NOTICES.txt"]').exists()).toBe(
      true
    );
  });
});

describe('Sky view copy', () => {
  const DUTCH = { route: '/nl' };

  it('privacy promises the camera starts on a tap and frames stay on the device', async () => {
    const text = (await mountSuspended(PrivacyPage)).text();
    expect(text).toContain('starts only after you tap "Start camera"');
    expect(text).toContain('not recorded, uploaded or stored');
    expect(text).toContain('orientation sensors');
  });

  it('privacy makes the same sky promises in Dutch', async () => {
    const text = (await mountSuspended(PrivacyPage, DUTCH)).text();
    expect(text).toContain('start pas nadat je op “Camera starten” tikt');
    expect(text).toContain('niet opgenomen, geüpload of opgeslagen');
    expect(text).toContain('bewegingssensoren');
  });

  it('accessibility lists the Sky view text alternative, Beta status and compass limit', async () => {
    const text = (await mountSuspended(AccessibilityPage)).text();
    expect(text).toContain('Sky view (Beta)');
    expect(text).toContain('table');
    expect(text).toContain('Beta');
    expect(text).toContain('off by 10° or more');
  });

  it('accessibility lists the same in Dutch', async () => {
    const text = (await mountSuspended(AccessibilityPage, DUTCH)).text();
    expect(text).toContain('Hemelzicht (bèta)');
    expect(text).toContain('tabel');
    expect(text).toContain('10° of meer');
  });
});
