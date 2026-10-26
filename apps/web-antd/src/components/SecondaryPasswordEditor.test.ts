import { flushPromises, shallowMount } from '@vue/test-utils';

import { Button, Input } from 'ant-design-vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NumericPasswordPad from './NumericPasswordPad.vue';
import SecondaryPasswordEditor from './SecondaryPasswordEditor.vue';

const api = vi.hoisted(() => ({ set: vi.fn(), reset: vi.fn(), send: vi.fn() }));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({ accessToken: 'fixture' }),
}));
vi.mock('#/api/core/auth', () => ({
  setSecondaryPasswordApi: api.set,
  resetSecondaryPasswordApi: api.reset,
  sendResetSecondaryPasswordCodeApi: api.send,
}));
function mountEditor(mode: 'change' | 'create' | 'recovery' = 'create') {
  return shallowMount(SecondaryPasswordEditor, {
    props: { open: true, mode },
    global: { renderStubDefaultSlot: true },
  });
}
async function enter(
  wrapper: ReturnType<typeof mountEditor>,
  password: string,
) {
  const pad = wrapper.findComponent(NumericPasswordPad);
  pad.vm.$emit('update:value', password);
  await wrapper.vm.$nextTick();
  pad.vm.$emit('submit');
  await flushPromises();
}
describe('数字二级密码设置', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('两次确认匹配后才提交，数字串与前导零保持原样', async () => {
    const wrapper = mountEditor();
    await enter(wrapper, '00123456789');
    expect(api.set).not.toHaveBeenCalled();
    await enter(wrapper, '9999');
    expect(wrapper.findComponent(NumericPasswordPad).props('error')).toBe(
      '两次输入的密码不一致',
    );
    await enter(wrapper, '00123456789');
    expect(api.set).toHaveBeenCalledWith({ password: '00123456789' });
    expect(wrapper.emitted('saved')).toHaveLength(1);
    wrapper.unmount();
  });
  it('旧密码也使用数字键盘，失败后保留数字旧密码便于修正', async () => {
    api.set.mockRejectedValueOnce(new Error('旧密码错误'));
    const wrapper = mountEditor('change');
    expect(wrapper.findComponent(NumericPasswordPad).props('title')).toBe(
      '验证旧二级密码',
    );
    await enter(wrapper, '0011');
    await enter(wrapper, '0012');
    await enter(wrapper, '0012');
    expect(api.set).toHaveBeenCalledWith({
      oldPassword: '0011',
      password: '0012',
    });
    expect(wrapper.findComponent(NumericPasswordPad).props('value')).toBe(
      '0011',
    );
    expect(wrapper.findComponent(NumericPasswordPad).props('title')).toBe(
      '验证旧二级密码',
    );
    expect(wrapper.emitted('saved')).toBeUndefined();
    wrapper.unmount();
  });
  it('邮箱找回提交验证码与数字密码', async () => {
    const wrapper = mountEditor('recovery');
    expect(wrapper.text()).not.toContain('使用旧密码修改');
    wrapper.findComponent(Input).vm.$emit('update:value', '123456');
    await wrapper.vm.$nextTick();
    wrapper.findAllComponents(Button).at(-1)!.vm.$emit('click');
    await wrapper.vm.$nextTick();
    await enter(wrapper, '0000');
    await enter(wrapper, '0000');
    expect(api.reset).toHaveBeenCalledWith({
      code: '123456',
      password: '0000',
    });
    expect(api.set).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it('关闭后迟到的成功响应不能继续通知或保留密码', async () => {
    let resolve!: () => void;
    api.set.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const wrapper = mountEditor();
    await enter(wrapper, '0012');
    await enter(wrapper, '0012');
    await wrapper.setProps({ open: false });
    resolve();
    await flushPromises();
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.findComponent(NumericPasswordPad).props('value')).toBe('');
    wrapper.unmount();
  });
});
