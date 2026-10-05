import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import WereadRecentCard from './WereadRecentCard.vue';

const mocks = vi.hoisted(() => ({ recent: vi.fn(), push: vi.fn() }));
const access = reactive({
  accessMenus: [{ path: '/record/weread', menuId: '1' }],
  loginExpired: false,
});
const user = reactive({ userInfo: { id: 'user1' } });
const locks = reactive({
  loaded: true,
  locked: false,
  unlockedPaths: new Set<string>(),
  showModal: false,
  pendingTargetPath: null,
});
vi.mock('@vben/stores', () => ({
  useAccessStore: () => access,
  useUserStore: () => user,
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('#/api/core/weread', () => ({ getWereadRecent: mocks.recent }));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    load: vi.fn(),
    cardMenu: () => ({ menuId: '1' }),
    visual: () => ({ icon: 'svg:weread' }),
  }),
}));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    get loaded() {
      return locks.loaded;
    },
    get showModal() {
      return locks.showModal;
    },
    get pendingTargetPath() {
      return locks.pendingTargetPath;
    },
    unlockedPaths: locks.unlockedPaths,
    isMenuLocked: () => locks.locked,
    isUnlocked: () => false,
    loadLockedMenus: vi.fn(),
  }),
}));
vi.mock('#/components/BusinessIcon.vue', () => ({
  default: { template: '<i />' },
}));
vi.mock('./BusinessCardCover.vue', () => ({ default: { template: '<i />' } }));
vi.mock('#/views/my-hub/weread/book-link.vue', () => ({
  default: {
    props: ['book'],
    template: '<a :href="book.deepLink"><slot /></a>',
  },
}));
enableAutoUnmount(afterEach);
beforeEach(() => {
  mocks.recent.mockReset();
  mocks.push.mockReset();
  locks.locked = false;
  access.loginExpired = false;
  user.userInfo.id = 'user1';
  mocks.recent.mockResolvedValue({
    connected: true,
    books: [
      {
        bookId: '9007199254740993',
        title: '模拟书籍',
        author: '作者',
        readUpdateTime: '1791163200',
        progress: 1,
        deepLink: 'https://weread.qq.com/web/reader/test',
      },
    ],
  });
});
it('书籍和标题点击不刷新，空白刷新合并请求且保留内容', async () => {
  const wrapper = mount(WereadRecentCard);
  await flushPromises();
  expect(wrapper.text()).toContain('1%');
  await wrapper.get('a').trigger('click');
  await wrapper.get('[aria-label="查看微信读书"]').trigger('click');
  expect(mocks.push).toHaveBeenCalledWith('/record/weread');
  expect(mocks.recent).toHaveBeenCalledTimes(1);
  let release!: (value: unknown) => void;
  mocks.recent.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await wrapper.get('[aria-label="刷新微信读书"]').trigger('click');
  await wrapper.get('[aria-label="刷新微信读书"]').trigger('click');
  await flushPromises();
  expect(mocks.recent).toHaveBeenCalledTimes(2);
  expect(wrapper.text()).toContain('模拟书籍');
  expect(wrapper.find('[aria-label="正在加载最近阅读"]').exists()).toBe(false);
  release({ connected: true, books: [] });
  await flushPromises();
  expect(wrapper.text()).toContain('暂无最近阅读');
});
it('失败保留已有书籍，空白处重试恢复', async () => {
  const wrapper = mount(WereadRecentCard);
  await flushPromises();
  mocks.recent.mockRejectedValueOnce(new Error('failed'));
  await wrapper.get('[aria-label="刷新微信读书"]').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('模拟书籍');
  expect(wrapper.text()).toContain('刷新失败');
  await wrapper.get('[aria-label="刷新微信读书"]').trigger('click');
  await flushPromises();
  expect(wrapper.text()).not.toContain('刷新失败');
});
it('菜单锁关闭展示数据并拒绝后台读取，未绑定隐藏卡片', async () => {
  const wrapper = mount(WereadRecentCard);
  await flushPromises();
  locks.locked = true;
  await flushPromises();
  expect(wrapper.text()).toContain('点击解锁');
  expect(wrapper.text()).not.toContain('模拟书籍');
  expect(mocks.recent).toHaveBeenCalledTimes(1);
  mocks.recent.mockResolvedValue({ connected: false, books: [] });
  locks.locked = false;
  await flushPromises();
  expect(wrapper.find('section').exists()).toBe(false);
});
it('账号变化使旧请求失效且不显示上个账号的数据', async () => {
  let release!: (value: unknown) => void;
  mocks.recent.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const wrapper = mount(WereadRecentCard);
  await flushPromises();
  user.userInfo.id = 'user2';
  await flushPromises();
  release({
    connected: true,
    books: [
      {
        bookId: 'old',
        title: '上个账号的书',
        readUpdateTime: '1',
        progress: 42,
      },
    ],
  });
  await flushPromises();
  expect(wrapper.text()).not.toContain('上个账号的书');
  expect(wrapper.text()).toContain('模拟书籍');
});
