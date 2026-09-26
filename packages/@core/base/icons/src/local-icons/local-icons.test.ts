import { flushPromises, mount } from '@vue/test-utils';

import { iconLoaded } from '@iconify/vue';
import { afterEach, expect, it, vi } from 'vitest';

import Icon from '../iconify-icon';
import manifest from './generated/manifest.json';
import { loadLocalIconCollection } from './index';

afterEach(() => vi.unstubAllGlobals());

it('registers every configured startup icon, including alias dependencies', () => {
  for (const icon of manifest.icons) expect(iconLoaded(icon), icon).toBe(true);
});

it('renders a saved non-startup local icon without contacting Iconify', async () => {
  const fetch = vi.fn().mockRejectedValue(new Error('Offline'));
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(Icon, { props: { icon: 'lucide:a-arrow-down' } });
  await vi.waitFor(() => expect(wrapper.find('svg').exists()).toBe(true));
  await flushPromises();
  expect(fetch).not.toHaveBeenCalled();
  wrapper.unmount();
});

it('loads all local picker names with registered SVG data', async () => {
  for (const { prefix } of manifest.collections) {
    const names = await loadLocalIconCollection(prefix);
    expect(names.length).toBeGreaterThan(0);
    for (const icon of names) expect(iconLoaded(icon), icon).toBe(true);
  }
});
