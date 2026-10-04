import { enableAutoUnmount, mount } from '@vue/test-utils';

import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfilePage from './index.vue';

const route = vi.hoisted(() => ({ query: { tab: 'llm' } }));

vi.mock('vue-router', () => ({ useRoute: () => route }));
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
vi.mock('./api-key-setting.vue', () => ({
  default: { template: '<div>API Key</div>' },
}));
vi.mock('./cbti-setting.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./mbti-setting.vue', () => ({ default: { template: '<div />' } }));
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
afterEach(() => vi.restoreAllMocks());

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

  it('独立 API Key 设置仍可通过链接打开', () => {
    route.query.tab = 'api-key';
    const wrapper = mount(ProfilePage);
    expect(wrapper.text()).toBe('API Key');
    expect(wrapper.findComponent({ name: 'Profile' }).props('modelValue')).toBe(
      'api-key',
    );
  });
});
