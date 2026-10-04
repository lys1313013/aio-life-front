import { enableAutoUnmount, mount } from '@vue/test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './index.vue';

const route = vi.hoisted(() => ({ query: { tab: 'llm' } }));
const replaceRoute = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace: replaceRoute }),
}));
vi.mock('@vben/stores', () => ({ useUserStore: () => ({ userInfo: {} }) }));
vi.mock('@vben/common-ui', () => ({
  Profile: {
    name: 'Profile',
    props: ['modelValue', 'tabs'],
    template: '<div><slot name="content" /></div>',
  },
}));
vi.mock('./base-setting.vue', () => ({
  default: { template: '<div>基本设置</div>' },
}));
vi.mock('./cbti-setting.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./mbti-setting.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./home-card-setting.vue', () => ({
  default: { template: '<div>首页卡片设置</div>' },
}));
vi.mock('./menu-display-setting.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./notification-setting.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./password-setting.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./secondary-password-setting.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./system-setting.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./user-bind.vue', () => ({ default: { template: '<div />' } }));

enableAutoUnmount(afterEach);
afterEach(() => {
  vi.restoreAllMocks();
  replaceRoute.mockClear();
});

describe('个人中心', () => {
  it('旧大模型配置链接回到基本设置', () => {
    route.query.tab = 'llm';
    const replace = vi.spyOn(window.history, 'replaceState');
    const wrapper = mount(ProfilePage);

    expect(wrapper.text()).toBe('基本设置');
    expect(wrapper.findComponent({ name: 'Profile' }).props('modelValue')).toBe(
      'basic',
    );
    expect(replace).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('tab=basic'),
    );
  });

  it('旧 API Key 链接跳到 AI 接入，不改写为基本设置', () => {
    route.query.tab = 'api-key';
    const replace = vi.spyOn(window.history, 'replaceState');
    const wrapper = mount(ProfilePage);
    expect(replaceRoute).toHaveBeenCalledWith('/mcp/api-keys');
    expect(replace).not.toHaveBeenCalled();
    expect(wrapper.findComponent({ name: 'Profile' }).exists()).toBe(false);
  });

  it('个人中心不再提供 API Key 标签', () => {
    route.query.tab = 'basic';
    const wrapper = mount(ProfilePage);
    expect(
      wrapper.findComponent({ name: 'Profile' }).props('tabs'),
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ value: 'api-key' })]),
    );
  });
});
