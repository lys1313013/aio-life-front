import { mount } from '@vue/test-utils';

import { describe, expect, it } from 'vitest';

import NumericPasswordPad from './NumericPasswordPad.vue';

describe('数字二级密码键盘', () => {
  it('至少四位才提交，保留前导零和长字符串', async () => {
    const wrapper = mount(NumericPasswordPad, { props: { value: '001' } });
    expect(
      wrapper.get('[aria-label="确认密码"]').attributes('disabled'),
    ).toBeDefined();
    await wrapper.setProps({ value: '0'.repeat(200) });
    await wrapper.get('[aria-label="确认密码"]').trigger('click');
    expect(wrapper.emitted('submit')).toHaveLength(1);
    await wrapper.get('[aria-label="0"]').trigger('click');
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual(['0'.repeat(201)]);
    await wrapper.get('[aria-label="删除一位"]').trigger('click');
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual(['0'.repeat(199)]);
    wrapper.unmount();
  });
  it('过滤非 ASCII 数字，键盘确认与 loading 不会重复提交', async () => {
    const wrapper = mount(NumericPasswordPad, {
      props: { value: '0012', recovery: true },
    });
    await wrapper.get('input').setValue('00a12１');
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual(['0012']);
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('submit')).toHaveLength(1);
    await wrapper.setProps({ busy: true });
    await wrapper.get('input').trigger('keydown', { key: 'Enter' });
    await wrapper.get('[aria-label="1"]').trigger('click');
    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('update:value')).toHaveLength(1);
    wrapper.unmount();
  });
});
