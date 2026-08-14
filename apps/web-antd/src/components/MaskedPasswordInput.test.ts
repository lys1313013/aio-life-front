import { mount } from '@vue/test-utils';

import { describe, expect, it } from 'vitest';

import MaskedPasswordInput from './MaskedPasswordInput.vue';

describe('maskedPasswordInput', () => {
  it('渲染为 text 输入框，并带关闭密码管理器语义的属性', () => {
    const wrapper = mount(MaskedPasswordInput);
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('text');
    expect(input.attributes('autocomplete')).toBe('off');
    expect(input.attributes('name')).toBe('secondary-password');
    expect(input.attributes('data-lpignore')).toBe('true');
  });

  it('密文态通过 CSS 遮罩类渲染成圆点（而不是 type=password）', () => {
    const wrapper = mount(MaskedPasswordInput);
    const input = wrapper.find('input');
    expect(input.attributes('type')).toBe('text');
    // 遮罩类挂在 affix-wrapper 上，由组件内 :deep 规则选中内部原生 input 施加遮罩
    expect(wrapper.find('.ant-input-affix-wrapper').classes()).toContain(
      'masked-password-input',
    );
  });

  it('点击眼睛切换明文后移除遮罩类', async () => {
    const wrapper = mount(MaskedPasswordInput);
    const affix = wrapper.find('.ant-input-affix-wrapper');
    expect(affix.classes()).toContain('masked-password-input');
    await wrapper.find('[role="button"]').trigger('click');
    expect(affix.classes()).not.toContain('masked-password-input');
  });

  it('输入时通过 v-model:value 向上抛值', async () => {
    const wrapper = mount(MaskedPasswordInput);
    await wrapper.find('input').setValue('abc123');
    const events = wrapper.emitted('update:value');
    expect(events).toBeTruthy();
    expect(events![0]).toEqual(['abc123']);
  });

  it('在输入框上按 Enter 会转发 keydown 事件（供 @keydown.enter 使用）', async () => {
    const wrapper = mount(MaskedPasswordInput);
    await wrapper
      .find('input')
      .trigger('keydown', { key: 'Enter', keyCode: 13 });
    const events = wrapper.emitted('keydown');
    expect(events).toBeTruthy();
    expect((events![0][0] as KeyboardEvent).key).toBe('Enter');
  });
});
