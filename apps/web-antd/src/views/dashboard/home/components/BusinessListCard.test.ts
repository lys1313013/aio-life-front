import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import BusinessListCard from './BusinessListCard.vue';

vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<i />' } }));
vi.mock('ant-design-vue', () => ({
  Dropdown: { template: '<div><slot /><slot name="overlay" /></div>' },
  Menu: { template: '<div><slot /></div>' },
  MenuItem: { template: '<button><slot /></button>' },
}));
vi.mock('./BusinessCardCover.vue', () => ({
  default: { template: '<span />' },
}));
enableAutoUnmount(afterEach);
const row = (id: string) => ({
  id,
  title: `记录 ${id}`,
  subtitle: '在读',
  record: {},
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function create(fetchPage: ReturnType<typeof vi.fn>) {
  return mount(BusinessListCard, {
    props: { title: '阅读', icon: 'book', fetchPage },
  });
}
function scrollArea(wrapper: ReturnType<typeof create>) {
  const area = wrapper.get('.overflow-y-auto');
  Object.defineProperties(area.element, {
    scrollHeight: { configurable: true, value: 300 },
    clientHeight: { configurable: true, value: 200 },
    scrollTop: { configurable: true, value: 100 },
  });
  return area;
}

describe('业务首页卡片请求与滚动', () => {
  it('首次错误可重试，成功空列表隐藏；失败不能当空数据', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ items: [], hasMore: false });
    const wrapper = create(fetchPage);
    await flushPromises();
    expect(wrapper.find('section').exists()).toBe(true);
    await wrapper.get('[aria-label="阅读加载失败，重试"]').trigger('click');
    await flushPromises();
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 1]);
    expect(wrapper.find('section').exists()).toBe(false);
  });

  it('触底分页去重，失败保留记录并重试原页，空页停止', async () => {
    const pending = deferred<{
      hasMore: boolean;
      items: ReturnType<typeof row>[];
    }>();
    const fetchPage = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [row('1'), row('2')], hasMore: true })
      .mockResolvedValue({ items: [], hasMore: true });
    const wrapper = create(fetchPage);
    const area = scrollArea(wrapper);
    pending.resolve({ items: [row('1')], hasMore: true });
    await flushPromises();
    await area.trigger('scroll');
    await area.trigger('scroll');
    await flushPromises();
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2]);
    expect(wrapper.text()).toContain('记录 1');
    await wrapper.get('[aria-label="阅读加载失败，重试"]').trigger('click');
    await flushPromises();
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2, 2]);
    expect(wrapper.findAll('.line-clamp-2')).toHaveLength(2);
    await area.trigger('scroll');
    await flushPromises();
    await area.trigger('scroll');
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2, 2, 3]);
  });

  it('刷新后的旧请求不得覆盖新内容；锁定清除内容且不继续请求', async () => {
    const stale = deferred<{
      hasMore: boolean;
      items: ReturnType<typeof row>[];
    }>();
    const fetchPage = vi
      .fn()
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue({ items: [row('new')], hasMore: false });
    const wrapper = create(fetchPage);
    await wrapper.vm.reload();
    stale.resolve({ items: [row('old')], hasMore: false });
    await flushPromises();
    expect(wrapper.text()).toContain('记录 new');
    expect(wrapper.text()).not.toContain('记录 old');
    await wrapper.setProps({ locked: true });
    expect(wrapper.text()).not.toContain('记录 new');
    await wrapper.vm.reload();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    await wrapper.setProps({ locked: false });
    await flushPromises();
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('刷新失败保留旧数据，内容编辑与新增动作各自触发', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [row('1')], hasMore: false })
      .mockRejectedValueOnce(new Error('offline'));
    const wrapper = create(fetchPage);
    await flushPromises();
    await wrapper.get('.line-clamp-2').trigger('click');
    expect(wrapper.emitted('edit')?.[0]).toEqual([row('1')]);
    await wrapper.get('[aria-label="新增阅读"]').trigger('click');
    expect(wrapper.emitted('add')).toHaveLength(1);
    await wrapper.get('[aria-label="刷新阅读"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('记录 1');
    expect(wrapper.find('[aria-label="阅读加载失败，重试"]').exists()).toBe(
      true,
    );
    expect(wrapper.get('section').attributes('style')).toContain(
      'max-height: 280px',
    );
  });
  it('顶部空白刷新去重；标题和新增不会刷新卡片', async () => {
    const pending = deferred<{
      hasMore: boolean;
      items: ReturnType<typeof row>[];
    }>();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [row('1')], hasMore: false })
      .mockReturnValueOnce(pending.promise);
    const wrapper = create(fetchPage);
    await flushPromises();
    await wrapper.get('header button:not([aria-label])').trigger('click');
    await wrapper.get('[aria-label="新增阅读"]').trigger('click');
    expect(wrapper.emitted('navigate')).toHaveLength(1);
    expect(wrapper.emitted('add')).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    const refresh = wrapper.get('[aria-label="刷新阅读"]');
    expect(refresh.text()).toBe('');
    expect(refresh.find('i, svg').exists()).toBe(false);
    await refresh.trigger('click');
    await refresh.trigger('click');
    expect(refresh.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('记录 1');
    expect(fetchPage).toHaveBeenCalledTimes(2);
    pending.resolve({ items: [row('2')], hasMore: false });
    await flushPromises();
    expect(refresh.attributes('disabled')).toBeUndefined();
    expect(wrapper.text()).toContain('记录 2');
  });
  it('排序中的刷新以新查询为准，旧排序响应不能覆盖新内容', async () => {
    const mutation = deferred<void>();
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [row('1'), row('2')], hasMore: false })
      .mockResolvedValue({ items: [row('3')], hasMore: false });
    const reorder = vi.fn().mockReturnValue(mutation.promise);
    const wrapper = mount(BusinessListCard, {
      props: {
        title: '目标',
        icon: 'target',
        fetchPage,
        reorder,
        unpin: vi.fn(),
      },
    });
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '下移')!
      .trigger('click');
    expect(reorder).toHaveBeenCalledWith(['2', '1']);
    await wrapper.vm.reload();
    mutation.resolve();
    await flushPromises();
    expect(wrapper.text()).toContain('记录 3');
    expect(wrapper.text()).not.toContain('记录 1');
  });
  it('服务端二级锁拒绝立即清除已有内容，通知父组件保持锁态', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [row('private')], hasMore: false })
      .mockRejectedValue({ response: { data: { rscode: '2001' } } });
    const wrapper = create(fetchPage);
    await flushPromises();
    await wrapper.vm.reload();
    expect(wrapper.text()).not.toContain('记录 private');
    expect(wrapper.emitted('access-denied')).toHaveLength(1);
  });
  it('紧凑列表保留全部记录，点条目编辑且触底继续分页', async () => {
    const rows = ['1', '2', '3', '4'].map((id) => ({
      ...row(id),
      media: true,
    }));
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: rows, hasMore: true })
      .mockResolvedValue({
        items: [{ ...row('5'), media: true }],
        hasMore: false,
      });
    const wrapper = mount(BusinessListCard, {
      props: { title: '阅读', icon: 'book', media: true, fetchPage },
    });
    const area = scrollArea(wrapper);
    await flushPromises();
    expect(wrapper.findAll('button[aria-label^="编辑"]')).toHaveLength(4);
    await wrapper.get('[aria-label="编辑记录 2"]').trigger('click');
    expect(wrapper.emitted('edit')?.[0]).toEqual([rows[1]]);
    await area.trigger('scroll');
    await flushPromises();
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([1, 2]);
    expect(wrapper.findAll('button[aria-label^="编辑"]')).toHaveLength(5);
  });
  it('首屏使用骨架，刷新保留内容且不追加占位，分页只在底部占位', async () => {
    type Page = { hasMore: boolean; items: ReturnType<typeof row>[] };
    const initial = deferred<Page>();
    const refresh = deferred<Page>();
    const more = deferred<Page>();
    const fetchPage = vi
      .fn()
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(refresh.promise)
      .mockReturnValueOnce(more.promise);
    const wrapper = create(fetchPage);
    const area = scrollArea(wrapper);
    await flushPromises();
    expect(wrapper.find('[role="status"][aria-label="加载中"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('.card-header-progress').exists()).toBe(false);
    expect(wrapper.find('.animate-spin').exists()).toBe(false);
    initial.resolve({ items: [row('1')], hasMore: true });
    await flushPromises();
    await wrapper.get('[aria-label="刷新阅读"]').trigger('click');
    expect(wrapper.text()).toContain('记录 1');
    expect(wrapper.find('[aria-label="正在刷新"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="加载中"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="加载更多"]').exists()).toBe(false);
    refresh.resolve({ items: [row('2')], hasMore: true });
    await flushPromises();
    expect(wrapper.find('[aria-label="正在刷新"]').exists()).toBe(false);
    await area.trigger('scroll');
    expect(wrapper.text()).toContain('记录 2');
    expect(wrapper.find('[aria-label="加载更多"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="正在刷新"]').exists()).toBe(false);
    more.resolve({ items: [row('3')], hasMore: false });
    await flushPromises();
    expect(wrapper.find('[aria-label="加载更多"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('记录 3');
  });
});
