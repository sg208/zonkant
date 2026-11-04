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
