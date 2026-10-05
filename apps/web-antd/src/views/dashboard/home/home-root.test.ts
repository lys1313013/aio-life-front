import { flushPromises, mount } from '@vue/test-utils';
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  reactive,
  ref,
  Transition,
  vShow,
  withDirectives,
} from 'vue';

import { describe, expect, it, vi } from 'vitest';

import Home from './index.vue';

const mocks = vi.hoisted(() => ({
  preferences: {},
  contentMounted: vi.fn(),
  contentUnmounted: vi.fn(),
}));
vi.mock('#/store/home-cards', () => ({
  useHomeCardsStore: () => mocks.preferences,
}));
vi.mock('@vben/stores', () => ({
  useUserStore: () => ({ userInfo: { id: 'fixture' } }),
}));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Skeleton: { template: '<div data-testid="skeleton" />' },
}));
vi.mock('./home-content.vue', () => ({
  default: {
    template: '<div data-testid="content" />',
    mounted: mocks.contentMounted,
    unmounted: mocks.contentUnmounted,
  },
}));

describe('首页路由根节点', () => {
  it.each([false, true])(
    '加载失败=%s 时支持路由显示指令和过渡',
    async (failed) => {
      let finish!: () => void;
      const preferences = reactive({
        error: false,
        items: [],
        loading: true,
        ready: false,
        load: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))),
      });
      mocks.preferences = preferences;
      const visible = ref(true);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const wrapper = mount(
        defineComponent({
          setup: () => () =>
            h(Transition, { css: false }, () =>
              h(KeepAlive, null, () =>
                withDirectives(h(Home), [[vShow, visible.value]]),
              ),
            ),
        }),
        { global: { stubs: { transition: false } } },
      );
      try {
        expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(true);
        preferences.loading = false;
        preferences.error = failed;
        preferences.ready = !failed;
        finish();
        await flushPromises();
        expect(wrapper.find('[data-testid="skeleton"]').exists()).toBe(false);
        expect(wrapper.find('[role="alert"]').exists()).toBe(failed);
        expect(wrapper.find('[data-testid="content"]').exists()).toBe(!failed);

        if (failed) {
          preferences.load.mockImplementationOnce(async () => {
            preferences.error = false;
            preferences.ready = true;
          });
          await wrapper.get('button').trigger('click');
          await flushPromises();
          expect(wrapper.find('[role="alert"]').exists()).toBe(false);
          expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
        }

        visible.value = false;
        await nextTick();
        expect((wrapper.element as HTMLElement).style.display).toBe('none');
        visible.value = true;
        await nextTick();
        expect((wrapper.element as HTMLElement).style.display).toBe('');
        expect(warn.mock.calls.flat().join('\n')).not.toMatch(
          /non-element root/,
        );
      } finally {
        wrapper.unmount();
        warn.mockRestore();
      }
    },
  );
});

it('真实 KeepAlive 离页返回保留首页内容实例', async () => {
  mocks.contentMounted.mockClear();
  mocks.contentUnmounted.mockClear();
  mocks.preferences = reactive({
    items: [],
    ready: true,
    error: false,
    loading: false,
    load: vi.fn(async () => {}),
  });
  const shown = ref(true);
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, null, () => (shown.value ? h(Home) : null)),
    }),
  );
  await flushPromises();
  const content = wrapper.get('[data-testid="content"]').element;
  shown.value = false;
  await flushPromises();
  expect(mocks.contentUnmounted).not.toHaveBeenCalled();
  shown.value = true;
  await flushPromises();
  expect(wrapper.get('[data-testid="content"]').element).toBe(content);
  expect(mocks.contentMounted).toHaveBeenCalledTimes(1);
  wrapper.unmount();
});

it('只调整顺序保留内容实例，启用项变化才重新初始化', async () => {
  mocks.contentMounted.mockClear();
  mocks.contentUnmounted.mockClear();
  const preferences = reactive({
    items: [
      { cardKey: 'section.time', enabled: true, sortOrder: 0 },
      { cardKey: 'section.thoughts', enabled: true, sortOrder: 1 },
    ],
    ready: true,
    error: false,
    loading: false,
    load: vi.fn(async () => {}),
  });
  mocks.preferences = preferences;
  const wrapper = mount(Home);
  await flushPromises();
  const content = wrapper.get('[data-testid="content"]').element;
  preferences.items = [
    { cardKey: 'section.thoughts', enabled: true, sortOrder: 0 },
    { cardKey: 'section.time', enabled: true, sortOrder: 1 },
  ];
  await flushPromises();
  expect(wrapper.get('[data-testid="content"]').element).toBe(content);
  expect(mocks.contentMounted).toHaveBeenCalledTimes(1);
  preferences.items[0]!.enabled = false;
  await flushPromises();
  expect(mocks.contentMounted).toHaveBeenCalledTimes(2);
  wrapper.unmount();
});
