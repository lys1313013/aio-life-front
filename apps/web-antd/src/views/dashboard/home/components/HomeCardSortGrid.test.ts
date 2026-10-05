import type { HomeCardPreference } from '#/api/core/home-cards';

import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { beforeEach, expect, it, vi } from 'vitest';

import Grid from './HomeCardSortGrid.vue';

const mocks = vi.hoisted(() => ({ store: {} as any }));
vi.mock('#/store/home-cards', () => ({ useHomeCardsStore: () => mocks.store }));
const cards = (): HomeCardPreference[] =>
  ['time', 'links', 'thoughts'].map((key, sortOrder) => ({
    cardKey: `section.${key}`,
    title: key,
    group: 'section',
    icon: '',
    enabled: key !== 'links',
    sortOrder,
  }));
beforeEach(() => {
  mocks.store = reactive({
    items: cards(),
    busy: '',
    loading: false,
    reorder: vi.fn(),
  });
});
function mountGrid() {
  return mount(Grid, {
    props: {
      items: mocks.store.items.filter(
        (item: HomeCardPreference) => item.enabled,
      ),
      group: 'section',
    },
    slots: { default: '<section>保留内容</section>' },
  });
}
it('首页键盘排序提交整组但不移动隐藏项，请求期间阻止重复排序', async () => {
  let finish!: () => void;
  mocks.store.reorder.mockImplementation(
    async (group: string, keys: string[]) => {
      mocks.store.busy = group;
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      mocks.store.items = keys.map((key, sortOrder) => ({
        ...mocks.store.items.find(
          (item: HomeCardPreference) => item.cardKey === key,
        ),
        sortOrder,
      }));
      mocks.store.busy = '';
    },
  );
  const wrapper = mountGrid();
  const content = wrapper.find('section').element;
  await wrapper
    .findAll('[data-card-key]')[0]!
    .trigger('keydown', { key: 'ArrowDown', altKey: true });
  expect(mocks.store.reorder).toHaveBeenCalledWith('section', [
    'section.thoughts',
    'section.links',
    'section.time',
  ]);
  expect(wrapper.find('[role="status"]').exists()).toBe(false);
  expect(wrapper.find('.home-sort-saving').exists()).toBe(false);
  await wrapper
    .findAll('[data-card-key]')[0]!
    .trigger('keydown', { key: 'ArrowDown', altKey: true });
  expect(mocks.store.reorder).toHaveBeenCalledTimes(1);
  expect(
    wrapper.findAll('section').some((section) => section.element === content),
  ).toBe(true);
  finish();
  await flushPromises();
  expect(wrapper.find('[aria-live]').exists()).toBe(false);
  wrapper.unmount();
});
it('排序失败恢复原顺序且边界操作不发送请求', async () => {
  mocks.store.reorder.mockRejectedValue(new Error('network'));
  const wrapper = mountGrid();
  const before = wrapper
    .findAll('[data-card-key]')
    .map((row) => row.attributes('data-card-key'));
  await wrapper
    .findAll('[data-card-key]')[0]!
    .trigger('keydown', { key: 'ArrowUp', altKey: true });
  expect(mocks.store.reorder).not.toHaveBeenCalled();
  await wrapper
    .findAll('[data-card-key]')[0]!
    .trigger('keydown', { key: 'ArrowDown', altKey: true });
  await flushPromises();
  expect(
    wrapper
      .findAll('[data-card-key]')
      .map((row) => row.attributes('data-card-key')),
  ).toEqual(before);
  wrapper.unmount();
});
