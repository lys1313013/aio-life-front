import { mount } from '@vue/test-utils';

import { describe, expect, it, vi } from 'vitest';

import MembershipLogo from './MembershipLogo.vue';

vi.mock('#/api/membership/providers', () => ({
  membershipProviderIconUrl: (key: string, dark = false) =>
    `/api/membership/provider-icons/${key}${dark ? '?dark=true' : ''}`,
}));
vi.mock('@vben/preferences', () => ({
  usePreferences: () => ({ isDark: { value: false } }),
}));
vi.mock('@vben/icons', () => ({
  IconifyIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
}));

describe('会员 Logo 降级', () => {
  it('加载失败使用分类图标，更换 key 后重新加载图片', async () => {
    const wrapper = mount(MembershipLogo, {
      props: { iconKey: 'logo', category: 'video', name: '腾讯视频' },
    });
    expect(wrapper.get('img').attributes('src')).toBe(
      '/api/membership/provider-icons/logo',
    );
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('i').attributes('data-icon')).toBe(
      'mdi:movie-open-outline',
    );
    await wrapper.setProps({ iconKey: 'another' });
    expect(wrapper.get('img').attributes('src')).toBe(
      '/api/membership/provider-icons/another',
    );
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe(
      '腾讯视频',
    );
  });
});
