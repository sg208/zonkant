import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaceSearch from '~/components/PlaceSearch.vue';

const feature = (name: string, lon: number, lat: number): object => ({
  geometry: { coordinates: [lon, lat] },
  properties: { name, country: 'Netherlands' },
});
const TWO = {
  features: [
    feature('Amsterdam', 4.9, 52.37),
    feature('Amstelveen', 4.86, 52.3),
  ],
};
const fetchMock = vi.fn();

type Wrapper = Awaited<ReturnType<typeof mountSuspended<typeof PlaceSearch>>>;

const mountSearch = (): Promise<Wrapper> => mountSuspended(PlaceSearch);

// Mount first, then fake timers (router-push-fake-timers learning)
const typeQuery = async (wrapper: Wrapper, value = 'amst'): Promise<void> => {
  vi.useFakeTimers();
  await wrapper.get('input').setValue(value);
  await vi.advanceTimersByTimeAsync(350);
  await flushPromises();
  vi.useRealTimers();
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(
    async () => new Response(JSON.stringify(TWO), { status: 200 })
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PlaceSearch', () => {
  it('has a labelled combobox wired to a listbox', async () => {
    const wrapper = await mountSearch();
    const input = wrapper.get('input');
    expect(wrapper.get(`label[for="${input.attributes('id')}"]`).text()).toBe(
      'Search a place'
    );
    expect(input.attributes('role')).toBe('combobox');
    expect(input.attributes('aria-autocomplete')).toBe('list');
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(input.attributes('autocomplete')).toBe('off');
    expect(input.attributes('enterkeyhint')).toBe('search');
    expect(input.attributes('spellcheck')).toBe('false');
    expect(
      wrapper.get(`#${input.attributes('aria-controls')}`).attributes('role')
    ).toBe('listbox');
    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe(
      'polite'
    );
    expect(wrapper.text()).toContain(
      'Search text is sent to Photon (komoot) to find places.'
    );
  });

  it('does not fetch until text is typed', async () => {
    await mountSearch();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lists options with ids and announces the count', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((option) => option.text())).toEqual([
      'Amsterdam, Netherlands',
      'Amstelveen, Netherlands',
    ]);
    expect(new Set(options.map((option) => option.attributes('id'))).size).toBe(
      2
    );
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[role="status"]').text()).toBe('2 places found');
  });

  it('says "1 place found" for one result', async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ features: [TWO.features[0]] }), {
          status: 200,
        })
    );
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    expect(wrapper.get('[role="status"]').text()).toBe('1 place found');
  });

  it('moves the active option with arrows and wraps', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const input = wrapper.get('input');
    const ids = wrapper
      .findAll('[role="option"]')
      .map((item) => item.attributes('id'));
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(ids[0]);
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(ids[1]);
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(ids[0]);
    await input.trigger('keydown', { key: 'ArrowUp' });
    expect(input.attributes('aria-activedescendant')).toBe(ids[1]);
    expect(
      wrapper.findAll('[role="option"]')[1]?.attributes('aria-selected')
    ).toBe('true');
  });

  it('Enter selects the active option', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const input = wrapper.get('input');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update')).toEqual([[{ lat: 52.37, lon: 4.9 }]]);
    expect((input.element as HTMLInputElement).value).toBe(
      'Amsterdam, Netherlands'
    );
    expect(input.attributes('aria-expanded')).toBe('false');
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0);
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Moved to Amsterdam, Netherlands'
    );
  });

  it('Enter without an active option does nothing and does not submit', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      cancelable: true,
    });
    wrapper.get('input').element.dispatchEvent(event);
    await flushPromises();
    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.emitted('update')).toBeUndefined();
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2);
  });

  it('Escape closes the list and keeps the text', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const input = wrapper.get('input');
    await input.trigger('keydown', { key: 'Escape' });
    expect(input.attributes('aria-expanded')).toBe('false');
    expect((input.element as HTMLInputElement).value).toBe('amst');
  });

  it('selects on click, preventing the mousedown blur', async () => {
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    const option = wrapper.findAll('[role="option"]')[1];
    const down = new MouseEvent('mousedown', {
      cancelable: true,
      bubbles: true,
    });
    option?.element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    option?.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(wrapper.emitted('update')).toEqual([[{ lat: 52.3, lon: 4.86 }]]);
  });

  it('announces empty and stays usable', async () => {
    fetchMock.mockImplementation(
      async () => new Response('{"features":[]}', { status: 200 })
    );
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    expect(wrapper.get('[role="status"]').text()).toBe('No places found');
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined();
  });

  it('announces an unavailable service and stays usable', async () => {
    fetchMock.mockImplementation(
      async () => new Response('x', { status: 500 })
    );
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    expect(wrapper.get('[role="status"]').text()).toBe(
      'Search is unavailable. Check your connection or type coordinates.'
    );
    expect(wrapper.get('input').attributes('disabled')).toBeUndefined();
  });

  it('announces searching while the request is pending', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const wrapper = await mountSearch();
    await typeQuery(wrapper);
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…');
  });

  // Protects: messages float over content instead of pushing it down.
  // Turns red if the popover is dropped or shown with results/after select.
  // Existing tests only read the status region, which cannot tell layouts apart.
  it('shows a hidden-from-AT popover for empty and error, not for results', async () => {
    fetchMock.mockImplementation(
      async () => new Response('{"features":[]}', { status: 200 })
    );
    const empty = await mountSearch();
    await typeQuery(empty);
    const popover = empty.get('.search__popover');
    expect(popover.text()).toBe('No places found');
    expect(popover.attributes('aria-hidden')).toBe('true');
    expect(empty.findAll('[role="status"] .search__popover')).toHaveLength(0);

    fetchMock.mockImplementation(
      async () => new Response('x', { status: 500 })
    );
    const failed = await mountSearch();
    await typeQuery(failed);
    expect(failed.get('.search__popover').text()).toContain(
      'Search is unavailable'
    );

    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(TWO), { status: 200 })
    );
    const found = await mountSearch();
    await typeQuery(found);
    expect(found.find('.search__popover').exists()).toBe(false);
    expect(found.get('[role="status"]').text()).toBe('2 places found');
  });
});
