import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookLink from './book-link.vue';

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('#/api/core/weread', () => ({ getWereadBookLink: api.get }));
vi.mock('ant-design-vue', () => ({
  Spin: { template: '<i role="progressbar" />' },
}));
enableAutoUnmount(afterEach);
const link = 'https://weread.qq.com/web/reader/7bd329e05debc57bdc79852';
const detailLink =
  'https://weread.qq.com/book-detail?type=1&v=7bd329e05debc57bdc79852';
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
  it.each([link, detailLink])(
    '已有链接直接打开阅读页：%s',
    async (deepLink) => {
      const wrapper = render(deepLink);
      expect(wrapper.get('a').attributes()).toMatchObject({
        href: link,
        target: '_blank',
        rel: 'noopener noreferrer',
      });
      await wrapper.get('a').trigger('click');
      expect(api.get).not.toHaveBeenCalled();
    },
  );
  it.each([link, detailLink])(
    '查询缺失链接后打开阅读页：%s',
    async (deepLink) => {
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
      expect(wrapper.find('[role="progressbar"]').exists()).toBe(true);
      expect(wrapper.get('button').attributes('disabled')).toBeDefined();
      expect(api.get).toHaveBeenCalledWith(book.bookId);
      resolve({ deepLink });
      await flushPromises();
      expect(popup.location.replace).toHaveBeenCalledWith(link);
      expect(wrapper.get('a').attributes('href')).toBe(link);
      expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
      expect(popup.close).not.toHaveBeenCalled();
    },
  );
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
  it.each([
    'javascript:alert(1)',
    'https://weread.qq.com.evil.example/book-detail?type=1&v=mock-book',
    'https://user:pass@weread.qq.com/book-detail?type=1&v=mock-book',
    'https://weread.qq.com/book-detail?type=1',
    'https://weread.qq.com/book-detail?type=1&v=',
  ])('拒绝不安全链接 %s', async (deepLink) => {
    api.get.mockResolvedValue({ deepLink });
    const wrapper = render(deepLink);
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.find('a').exists()).toBe(false);
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
  });
  it('无书籍ID的有声内容保持展示，不产生无效跳转', () => {
    const wrapper = mount(BookLink);
    expect(wrapper.find('a, button').exists()).toBe(false);
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

describe('手机浏览器打开 App', () => {
  it.each([
    'Android Chrome/130',
    'iPhone Safari/18',
    'iPhone MicroMessenger/8',
  ])('用户点击直接使用书籍 ID 唤起，保留网页入口：%s', async (ua) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
    const wrapper = render(detailLink);
    const primary = wrapper.get('a');
    expect(primary.attributes('href')).toContain(
      'reading?bId=3300144307&style=1',
    );
    expect(primary.attributes('href')).not.toContain('bId=7bd329');
    expect(primary.attributes('target')).toBeUndefined();
    await primary.trigger('click');
    expect(wrapper.findAll('a')[1]?.attributes('href')).toBe(link);
    expect(api.get).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });
  it('缺少网页链接时仍可立即唤起，用户选择网页后才请求', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    const wrapper = render();
    await wrapper.get('a').trigger('click');
    expect(api.get).not.toHaveBeenCalled();
    api.get.mockResolvedValue({ deepLink: detailLink });
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(popup.location.replace).toHaveBeenCalledWith(link);
  });
  it('切换书籍时丢弃上一本书的待返回网页链接', async () => {
    let resolve!: (value: { deepLink: string }) => void;
    api.get.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const wrapper = render();
    await wrapper.get('button').trigger('click');
    await wrapper.setProps({ book: { bookId: '42', title: '另一本书' } });
    resolve({ deepLink: link });
    await flushPromises();
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(wrapper.find('a').exists()).toBe(false);
  });
});
