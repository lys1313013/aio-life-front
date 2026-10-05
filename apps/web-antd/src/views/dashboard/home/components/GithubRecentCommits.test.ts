import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, expect, it, vi } from 'vitest';

import GithubRecentCommits from './GithubRecentCommits.vue';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('#/api/core/github', () => ({ getRecentCommitsApi: mocks.fetch }));
vi.mock('ant-design-vue', () => ({
  Skeleton: { template: '<div data-skeleton />' },
}));
enableAutoUnmount(afterEach);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('刷新失败保留已展示提交与分页，后续仍从第 2、3 页继续', async () => {
  let reject!: (error: Error) => void;
  const refresh = new Promise((_, fail) => {
    reject = fail;
  });
  const rows = (start: number, size = 10) =>
    Array.from({ length: size }, (_, index) => ({
      id: String(start + index),
      repo: 'fixture',
      message: `模拟提交 ${start + index}`,
    }));
  let intersect!: () => void;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersect = () => callback([{ isIntersecting: true }]);
      }
      disconnect() {}
      observe() {}
    },
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.fetch
    .mockReset()
    .mockResolvedValueOnce(rows(1))
    .mockReturnValueOnce(refresh)
    .mockResolvedValueOnce(rows(11))
    .mockResolvedValueOnce(rows(21, 1));
  const wrapper = mount(GithubRecentCommits);
  await flushPromises();
  const operation = wrapper.vm.load();
  await flushPromises();
  expect(wrapper.text()).toContain('模拟提交 1');
  expect(wrapper.find('[data-skeleton]').exists()).toBe(false);
  reject(new Error('模拟刷新失败'));
  await operation;
  expect(wrapper.text()).toContain('模拟提交 10');
  intersect();
  await flushPromises();
  intersect();
  await flushPromises();
  expect(mocks.fetch.mock.calls.map((call) => call[1])).toEqual([1, 1, 2, 3]);
  expect(wrapper.text()).toContain('模拟提交 21');
  expect(wrapper.text()).toContain('已经到底了');
});

it('首次失败显示重试，不冒充空态；分页失败保留记录且停止自动重试', async () => {
  let intersect!: () => void;
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        intersect = () => callback([{ isIntersecting: true }]);
      }
      disconnect() {}
      observe() {}
    },
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.fetch
    .mockReset()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: String(index),
        repo: 'fixture',
        message: '已有提交',
      })),
    )
    .mockRejectedValueOnce(new Error('page offline'))
    .mockResolvedValueOnce([
      { id: 'more', repo: 'fixture', message: '下一页提交' },
    ]);
  const wrapper = mount(GithubRecentCommits);
  await flushPromises();
  expect(wrapper.text()).not.toContain('暂无最近提交');
  await wrapper
    .get('button[aria-label="最近提交加载失败，重试"]')
    .trigger('click');
  await flushPromises();
  intersect();
  await flushPromises();
  expect(wrapper.text()).toContain('已有提交');
  intersect();
  await flushPromises();
  expect(mocks.fetch).toHaveBeenCalledTimes(3);
  await wrapper
    .get('button[aria-label="加载更多提交失败，重试"]')
    .trigger('click');
  await flushPromises();
  expect(mocks.fetch.mock.calls.map((call) => call[1])).toEqual([1, 1, 2, 2]);
  expect(wrapper.text()).toContain('下一页提交');
});
