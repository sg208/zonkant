import { mountSuspended } from '@nuxt/test-utils/runtime';
import type { VueWrapper } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SkyTimesTable from '~/components/SkyTimesTable.vue';

// Amsterdam, selected date 2026-03-20 (equinox)
const PROPS = { lat: 52.3731, lon: 4.8926, date: '2026-03-20' };

interface TableRow {
  day: string;
  cells: string[];
}

const rowsOf = (wrapper: VueWrapper): TableRow[] =>
  wrapper.findAll('tbody tr').map((row) => ({
    day: row.find('th').text(),
    cells: row.findAll('td').map((cell) => cell.text()),
  }));

describe('SkyTimesTable', () => {
  it('has a caption and scoped headers', async () => {
    const wrapper = await mountSuspended(SkyTimesTable, { props: PROPS });
    expect(wrapper.find('caption').text()).toContain('every full hour');
    const columnHeaders = wrapper.findAll('thead th');
    expect(columnHeaders.map((header) => header.attributes('scope'))).toEqual([
      'col',
      'col',
      'col',
      'col',
    ]);
    const rowHeaders = wrapper.findAll('tbody th');
    expect(rowHeaders.length).toBeGreaterThan(0);
    for (const header of rowHeaders) {
      expect(header.attributes('scope')).toBe('row');
    }
  });

  it('lists the selected day and both solstices at full hours', async () => {
    const rows = rowsOf(await mountSuspended(SkyTimesTable, { props: PROPS }));
    const selected = rows.filter((row) => row.day.includes('20 March 2026'));
    const june = rows.filter((row) => row.day.includes('21 June 2026'));
    const december = rows.filter((row) => row.day.includes('21 December 2026'));
    expect(selected.length).toBeGreaterThan(8);
    expect(june.length).toBeGreaterThan(selected.length);
    expect(december.length).toBeGreaterThan(5);
    expect(december.length).toBeLessThan(selected.length);
    expect(rows).toHaveLength(selected.length + june.length + december.length);
    for (const row of rows) {
      expect(row.cells[0]).toMatch(/^\d\d:00$/);
    }
  });

  it('gives direction as degrees plus compass name and height with one decimal', async () => {
    const rows = rowsOf(await mountSuspended(SkyTimesTable, { props: PROPS }));
    const winterNoon = rows.find(
      (row) => row.day.includes('21 December') && row.cells[0] === '12:00'
    );
    // Dec 21 Amsterdam: solar noon is ~12:38, peak 14.2 degrees; 38 min earlier it is
    // 14.2 - 0.44 = 13.8 degrees, just east of south
    expect(winterNoon?.cells[1]).toMatch(/^17\d° S$/);
    expect(winterNoon?.cells[2]).toBe('13.8°');
  });

  it('reads in Dutch with Dutch compass names and decimal comma', async () => {
    const wrapper = await mountSuspended(SkyTimesTable, {
      props: PROPS,
      route: '/nl',
    });
    expect(wrapper.find('caption').text()).toContain('elk heel uur');
    const rows = rowsOf(wrapper);
    const winterNoon = rows.find(
      (row) => row.day.includes('21 december') && row.cells[0] === '12:00'
    );
    expect(winterNoon?.cells[1]).toMatch(/^17\d° Z$/);
    expect(winterNoon?.cells[2]).toBe('13,8°');
  });
});
