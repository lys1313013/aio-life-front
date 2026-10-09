import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import QuickNavSection from './QuickNavSection.vue';

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  state: {} as any,
}));
vi.mock('#/store/quick-nav', () => ({ useQuickNavStore: () => mocks.state }));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    load: vi.fn(),
    menuVisual: () => ({ icon: 'book' }),
  }),
}));
vi.mock('#/api/core/quick-nav', () => ({
  QUICK_NAV_MAX: 12,
  getQuickNavCandidatesApi: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('#/components/BusinessIcon.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('./QuickNavPickerModal.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('vuedraggable', () => ({ default: { template: '<div />' } }));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Empty: { template: '<div><slot /></div>' },
  Spin: { template: '<i />' },
  message: { success: vi.fn(), warning: vi.fn() },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  mocks.load.mockReset();
  mocks.state = reactive({
    loading: false,
    loaded: true,
    error: null,
    items: [
      {
        menuId: '1',
        title: '模拟导航',
        path: '/task/todo',
        enabled: 1,
        sortOrder: 0,
      },
    ],
    load: mocks.load,
    save: mocks.save,
  });
});
it('头部空白合并刷新，编辑期间禁止触发，不覆盖草稿', async () => {
  let release!: () => void;
  mocks.load.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        release = done;
      }),
  );
  const wrapper = mount(QuickNavSection);
  const refresh = wrapper.get('[aria-label="刷新快捷导航"]');
  await refresh.trigger('click');
  await refresh.trigger('click');
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(refresh.attributes('disabled')).toBeDefined();
  release();
  await flushPromises();
  await wrapper.get('[title="编辑快捷导航"]').trigger('click');
  expect(refresh.attributes('disabled')).toBeDefined();
  await refresh.trigger('click');
  expect(mocks.load).toHaveBeenCalledTimes(1);
});
it('已有导航的失败保留内容，仅标题栏显示局部重试', () => {
  mocks.state.error = 'offline';
  const wrapper = mount(QuickNavSection);
  expect(wrapper.text()).toContain('模拟导航');
  expect(wrapper.find('[aria-label="快捷导航加载失败，重试"]').exists()).toBe(
    true,
  );
});
