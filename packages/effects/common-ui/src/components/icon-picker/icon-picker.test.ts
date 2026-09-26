/* eslint-disable vue/one-component-per-file -- lightweight component stubs */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, defineComponent, h } from 'vue';

import { beforeEach, expect, it, vi } from 'vitest';

import IconPicker from './icon-picker.vue';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('./icons', () => ({ fetchIconsData: mocks.fetch }));
vi.mock('@vben/icons', () => ({
  EmptyIcon: 'span',
  Grip: 'span',
  LoaderCircle: 'span',
  RotateCw: 'span',
  listIcons: () => [],
}));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('@vben-core/shared/utils', () => ({
  isFunction: (value: unknown) => typeof value === 'function',
}));
vi.mock('@vben/hooks', () => ({
  usePagination: (list: { value: string[] }) => ({
    paginationList: list,
    total: computed(() => list.value.length),
    setCurrentPage: vi.fn(),
    currentPage: 1,
  }),
}));
vi.mock('@vben-core/shadcn-ui', () => {
  const passthrough = defineComponent({
    setup:
      (_, { slots, attrs }) =>
      () =>
        h('div', attrs, slots.default?.()),
  });
  const button = defineComponent({
    setup:
      (_, { slots, attrs }) =>
      () =>
        h('button', attrs, slots.default?.()),
  });
  return {
    Button: button,
    Input: 'input',
    Pagination: passthrough,
    PaginationEllipsis: passthrough,
    PaginationFirst: passthrough,
    PaginationLast: passthrough,
    PaginationList: passthrough,
    PaginationListItem: passthrough,
    PaginationNext: passthrough,
    PaginationPrev: passthrough,
    VbenIcon: defineComponent({
      props: { icon: { type: String, default: '' } },
      setup: (props) => () => h('span', { 'data-icon': props.icon }),
    }),
    VbenIconButton: button,
    VbenPopover: passthrough,
  };
});

beforeEach(() => mocks.fetch.mockReset());

it('retries after reopening and offers a retry button', async () => {
  mocks.fetch
    .mockRejectedValueOnce(new Error('Offline'))
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValue(['mdi:run']);
  const wrapper = mount(IconPicker, { props: { prefix: 'mdi' } });
  expect(mocks.fetch).not.toHaveBeenCalled();
  wrapper.vm.open();
  await flushPromises();
  expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  wrapper.vm.close();
  await flushPromises();
  wrapper.vm.open();
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  await wrapper
    .get('button[aria-label="ui.iconPicker.retry"]')
    .trigger('click');
  await flushPromises();
  expect(wrapper.find('[data-icon="mdi:run"]').exists()).toBe(true);
  expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  wrapper.unmount();
});

it('does not let an older collection overwrite the latest selection', async () => {
  let complete!: (names: string[]) => void;
  mocks.fetch
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    )
    .mockResolvedValueOnce(['lucide:home']);
  const wrapper = mount(IconPicker, { props: { prefix: 'mdi' } });
  wrapper.vm.open();
  await flushPromises();
  expect(wrapper.find('[role="status"]').exists()).toBe(true);
  await wrapper.setProps({ prefix: 'lucide' });
  await flushPromises();
  complete(['mdi:run']);
  await flushPromises();
  expect(wrapper.find('[data-icon="lucide:home"]').exists()).toBe(true);
  expect(wrapper.find('[data-icon="mdi:run"]').exists()).toBe(false);
  wrapper.unmount();
});
