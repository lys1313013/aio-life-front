import { flushPromises, shallowMount } from '@vue/test-utils';

import { Button, message, Tree } from 'ant-design-vue';
import { describe, expect, it, vi } from 'vitest';

import { AppModal } from '#/components/app-modal';
import MaskedPasswordInput from '#/components/MaskedPasswordInput.vue';

import Setting from './secondary-password-setting.vue';

const api = vi.hoisted(() => ({ save: vi.fn(async () => {}) }));
vi.mock('@vben/stores', () => ({ useUserStore: () => ({ userInfo: {} }) }));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({ saveLockedMenus: api.save }),
}));
vi.mock('#/api/core/auth', () => ({
  getSecondaryLockMenusApi: async () => ['9007199254740993'],
  getSecondaryPasswordStatusApi: async () => ({ hasPassword: true }),
  resetSecondaryPasswordApi: vi.fn(),
  sendResetSecondaryPasswordCodeApi: vi.fn(),
  setSecondaryPasswordApi: vi.fn(),
}));
vi.mock('#/api/core/menu', () => ({
  getAllMenusApi: async () => [
    { meta: { menuId: '9007199254740992', title: 'A' } },
    { meta: { menuId: '9007199254740993', title: 'B' } },
  ],
}));
describe('菜单锁设置 ID 往返', () => {
  it('大整数树 key、选中值与保存体保持相邻 ID 区别', async () => {
    vi.spyOn(message, 'success').mockImplementation(
      () => (() => {}) as ReturnType<typeof message.success>,
    );
    const wrapper = shallowMount(Setting, {
      global: {
        renderStubDefaultSlot: true,
        stubs: {
          ATree: {
            inheritAttrs: false,
            props: ['treeData', 'checkedKeys'],
            template: '<div />',
          },
          AInput: { inheritAttrs: false, template: '<input />' },
          AAlert: { template: '<div />' },
        },
      },
    });
    await flushPromises();
    const tree = wrapper.findComponent(Tree);
    expect(tree.props('treeData')?.map((n) => n.key)).toEqual([
      '9007199254740992',
      '9007199254740993',
    ]);
    expect(tree.props('checkedKeys')).toEqual(['9007199254740993']);
    wrapper
      .findAllComponents(Button)
      .find((b) => b.text().includes('保存菜单锁'))!
      .vm.$emit('click');
    await wrapper.vm.$nextTick();
    const modal = wrapper
      .findAllComponents(AppModal)
      .find((m) => m.props('open'))!;
    modal
      .findComponent(MaskedPasswordInput)
      .vm.$emit('update:value', 'test-only');
    await wrapper.vm.$nextTick();
    modal.vm.$emit('ok');
    await flushPromises();
    expect(api.save).toHaveBeenCalledWith(['9007199254740993'], 'test-only');
    wrapper.unmount();
  });
});
