import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookLink from './book-link.vue';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('#/api/core/weread', () => ({ getWereadBookLink: api.get }));
vi.mock('ant-design-vue', () => ({
  Spin: { template: '<i role="progressbar" />' },
}));
enableAutoUnmount(afterEach);
const link = 'https://weread.qq.com/web/reader/mock-book';
const book = { bookId: '3300144307', title: '模拟书籍' };
let popup: {
  close: ReturnType<typeof vi.fn>;
  closed: boolean;
  location: { replace: ReturnType<typeof vi.fn> };
  opener: unknown;
};
beforeEach(() => {
  vi.restoreAllMocks();
  api.get.mockReset();
  popup = {
    close: vi.fn(),
    closed: false,
    location: { replace: vi.fn() },
    opener: {},
  };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
});
function render(deepLink?: string) {
  return mount(BookLink, {
    props: { book: { ...book, deepLink } },
    slots: { default: '<span>01</span><div>模拟书籍</div>' },
  });
}
describe('阅读排行打开书籍', () => {
  it('直接使用官方链接，保留原生新标签链接且无需请求', async () => {
    const wrapper = render(link);
    expect(wrapper.get('a').attributes()).toMatchObject({
      href: link,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    await wrapper.get('a').trigger('click');
    expect(api.get).not.toHaveBeenCalled();
  });
  it('点击后查询缺失链接，仅该行加载且禁止重复查询', async () => {
    let resolve!: (value: { deepLink: string }) => void;
    api.get.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const wrapper = render();
    await wrapper.get('button').trigger('click');
    expect(popup.opener).toBeNull();
    expect(wrapper.get('[role="progressbar"]').exists()).toBe(true);
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(api.get).toHaveBeenCalledWith(book.bookId);
    resolve({ deepLink: link });
    await flushPromises();
    expect(popup.location.replace).toHaveBeenCalledWith(link);
    expect(wrapper.get('a').attributes('href')).toBe(link);
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(popup.close).not.toHaveBeenCalled();
  });
  it('失败关闭空白页，保留书籍并允许重试', async () => {
    api.get
      .mockRejectedValueOnce(new Error('模拟失败'))
      .mockResolvedValueOnce({ deepLink: link });
    const wrapper = render();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(popup.close).toHaveBeenCalledOnce();
    expect(wrapper.get('[role="alert"]').text()).toContain('重试');
    expect(wrapper.text()).toContain('模拟书籍');
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(wrapper.get('a').attributes('href')).toBe(link);
  });
  it('浏览器阻止弹窗时，提供可再次点击的原生链接', async () => {
    vi.mocked(window.open).mockReturnValue(null);
    api.get.mockResolvedValue({ deepLink: link });
    const wrapper = render();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('a').attributes('href')).toBe(link);
    expect(wrapper.get('[role="alert"]').text()).toContain('再次点击');
  });
  it.each(['javascript:alert(1)', 'https://weread.qq.com.evil.example/book'])(
    '拒绝不安全链接 %s',
    async (deepLink) => {
      api.get.mockResolvedValue({ deepLink });
      const wrapper = render(deepLink);
      await wrapper.get('button').trigger('click');
      await flushPromises();
      expect(wrapper.find('a').exists()).toBe(false);
      expect(popup.location.replace).not.toHaveBeenCalled();
      expect(popup.close).toHaveBeenCalled();
    },
  );
  it('无书籍ID的有声内容保持展示，不产生无效跳转', () => {
    const wrapper = mount(BookLink);
    expect(wrapper.element.tagName).toBe('DIV');
  });
  it('离页后关闭待打开窗口，迟到结果不触发跳转', async () => {
    let resolve!: (value: { deepLink: string }) => void;
    api.get.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const wrapper = render();
    await wrapper.get('button').trigger('click');
    wrapper.unmount();
    resolve({ deepLink: link });
    await flushPromises();
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
  });
});
