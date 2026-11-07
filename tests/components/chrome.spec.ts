import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import AppFooter from '~/components/AppFooter.vue';
import AppHeader from '~/components/AppHeader.vue';
import ErrorPage from '~/error.vue';
import AppLayout from '~/layouts/app.vue';
import DefaultLayout from '~/layouts/default.vue';

const year = new Date().getFullYear();

const makeError = (statusCode: number): ReturnType<typeof createError> =>
  createError({ statusCode });

describe('AppHeader', () => {
  it('has a wordmark that links home', async () => {
    const wrapper = await mountSuspended(AppHeader);
    const link = wrapper.find('a[href="/"]');
    expect(link.text()).toBe('Zonkant');
  });
});

describe('AppFooter', () => {
  it('links to the legal pages and credits', async () => {
    const wrapper = await mountSuspended(AppFooter);
    for (const [href, label] of [
      ['/accessibility', 'Accessibility'],
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
      ['/credits', 'Credits'],
    ]) {
      expect(wrapper.find(`a[href="${href}"]`).text()).toContain(label);
    }
  });

  it('credits the map data and tiles', async () => {
    const text = (await mountSuspended(AppFooter)).text();
    expect(text).toContain('Map data from OpenStreetMap contributors');
    expect(text).toContain('tiles by OpenFreeMap');
  });

  it('links to the source in a new tab with a hint', async () => {
    const wrapper = await mountSuspended(AppFooter);
    const link = wrapper.find('a[href="https://github.com/sg208/zonkant"]');
    expect(link.text()).toContain('Source on GitHub');
    expect(link.text()).toContain('(opens in a new tab)');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });

  it('keeps year, author and licence in one element', async () => {
    const wrapper = await mountSuspended(AppFooter);
    const credit = wrapper
      .findAll('p')
      .find((node) => node.text().includes(`© ${year} Syailendra Ginting.`));
    expect(credit?.text()).toBe(`© ${year} Syailendra Ginting. MIT licence.`);
  });
});

describe('layouts', () => {
  it('default layout has a skip link, main, header and footer', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      slots: { default: '<p>Body</p>' },
    });
    expect(wrapper.find('a.skip-link[href="#main"]').exists()).toBe(true);
    expect(wrapper.find('main#main').text()).toBe('Body');
    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.find('footer').exists()).toBe(true);
  });

  it('app layout is a full-screen shell with no footer', async () => {
    const wrapper = await mountSuspended(AppLayout, {
      slots: { default: '<p>Map</p>' },
    });
    expect(wrapper.find('a.skip-link[href="#main"]').exists()).toBe(true);
    expect(wrapper.find('main#main').text()).toBe('Map');
    expect(wrapper.find('header a[href="/"]').exists()).toBe(true);
    expect(wrapper.find('footer').exists()).toBe(false);
  });
});

describe('error page', () => {
  it('says the page was not found for a 404 and links home', async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: makeError(404) },
    });
    expect(wrapper.findAll('h1')).toHaveLength(1);
    expect(wrapper.find('h1').text()).toBe('Page not found');
    expect(wrapper.find('main a[href="/"]').exists()).toBe(true);
  });

  it('uses a generic message for other errors', async () => {
    const wrapper = await mountSuspended(ErrorPage, {
      props: { error: makeError(500) },
    });
    expect(wrapper.find('h1').text()).toBe('Page error');
    expect(wrapper.text()).toContain('500');
  });
});

// Dutch chrome. The test config makes en the default locale, so nl lives under /nl.
describe('chrome in Dutch', () => {
  const DUTCH = { route: '/nl' };

  it('footer labels, links and licence line are Dutch', async () => {
    const wrapper = await mountSuspended(AppFooter, DUTCH);
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Voettekst');
    expect(wrapper.find('a[href="/nl/accessibility"]').text()).toBe(
      'Toegankelijkheid'
    );
    expect(wrapper.find('a[href="/nl/terms"]').text()).toBe('Voorwaarden');
    expect(wrapper.text()).toContain('Kaartgegevens van OpenStreetMap');
    expect(wrapper.text()).toContain('(opent in een nieuw tabblad)');
    const credit = wrapper
      .findAll('p')
      .find((node) => node.text().includes(`© ${year} Syailendra Ginting.`));
    expect(credit?.text()).toBe(`© ${year} Syailendra Ginting. MIT-licentie.`);
  });

  it('layouts carry a Dutch skip link', async () => {
    const wrapper = await mountSuspended(DefaultLayout, {
      ...DUTCH,
      slots: { default: '<p>Body</p>' },
    });
    expect(wrapper.get('a.skip-link').text()).toBe('Naar de inhoud');
    const app = await mountSuspended(AppLayout, {
      ...DUTCH,
      slots: { default: '<p>Map</p>' },
    });
    expect(app.get('a.skip-link').text()).toBe('Naar de inhoud');
  });

  it('header offers the other language as a link in that language', async () => {
    const wrapper = await mountSuspended(AppHeader, DUTCH);
    const link = wrapper.get('nav a[hreflang="en"]');
    expect(link.text()).toBe('English');
    expect(link.attributes('lang')).toBe('en');
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Taal');
  });

  it('error page speaks Dutch and links home', async () => {
    const notFound = await mountSuspended(ErrorPage, {
      ...DUTCH,
      props: { error: makeError(404) },
    });
    expect(notFound.get('h1').text()).toBe('Pagina niet gevonden');
    expect(notFound.find('main a[href="/nl"]').text()).toContain('Terug');
    const failed = await mountSuspended(ErrorPage, {
      ...DUTCH,
      props: { error: makeError(500) },
    });
    expect(failed.get('h1').text()).toBe('Er ging iets mis');
    expect(failed.text()).toContain('fout 500');
  });
});
