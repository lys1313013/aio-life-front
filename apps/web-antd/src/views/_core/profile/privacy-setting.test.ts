import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive, ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PrivacySetting from './privacy-setting.vue';

const mocks = vi.hoisted(() => ({
  close: vi.fn(),
  finish: vi.fn(),
  getUser: vi.fn(),
  success: vi.fn(),
  push: vi.fn(),
}));
let userStore: {
  setUserInfo: (value: Record<string, unknown>) => void;
  userInfo: Record<string, unknown>;
};
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@vben/stores', () => ({ useUserStore: () => userStore }));
vi.mock('#/store', () => ({
  useAuthStore: () => ({ finishAccountClosure: mocks.finish }),
}));
vi.mock('#/api/core/legal', () => ({ closeAccount: mocks.close }));
vi.mock('#/api/core/user', () => ({ getUserInfoApi: mocks.getUser }));
vi.mock('#/components/legal-policy/use-legal-policy', () => ({
  useLegalPolicy: () => ({
    policy: ref(null),
    loading: ref(false),
    error: ref(''),
    load: vi.fn(),
  }),
}));
vi.mock('#/components/legal-policy/LegalPolicyContent.vue', () => ({
  default: { template: '<div />' },
}));
vi.mock('./closure-wechat-verification.vue', () => ({
  default: {
    name: 'ClosureWechatVerification',
    emits: ['verified'],
    template: '<div>微信验证</div>',
  },
}));
vi.mock('#/components/app-modal', () => ({
  AppModal: {
    props: ['open'],
    template: '<section v-if="open"><slot /></section>',
  },
}));
vi.mock('ant-design-vue', () => {
  const Field = defineComponent({
    props: { value: { type: String, default: '' }, disabled: Boolean },
    emits: ['update:value'],
    template: `<input :value="value" :disabled="disabled" @input="$emit('update:value', $event.target.value)" />`,
  });
  return {
    Button: {
      props: ['disabled', 'loading'],
      emits: ['click'],
      template: `<button :disabled="disabled || loading" @click="$emit('click')"><slot /></button>`,
    },
    Input: Object.assign(Field, { Password: Field }),
    Popconfirm: {
      name: 'Popconfirm',
      emits: ['confirm'],
      template: '<div><slot /></div>',
    },
    Spin: { template: '<div><slot /></div>' },
    message: { success: mocks.success },
  };
});
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  userStore = reactive({
    userInfo: {},
    setUserInfo(value) {
      this.userInfo = value;
    },
  });
  mocks.getUser.mockResolvedValue({
    id: '9223372036854775807',
    hasPassword: true,
    wechatBound: true,
  });
  mocks.close.mockResolvedValue(null);
  mocks.finish.mockResolvedValue(undefined);
});
function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((node) => node.text() === label)!;
}
async function open() {
  const wrapper = mount(PrivacySetting);
  await button(wrapper, '注销账号').trigger('click');
  await flushPromises();
  return wrapper;
}
describe('账号注销', () => {
  it('必须明确输入确认文字，失败时保留密码与确认内容，不清理登录', async () => {
    const wrapper = await open();
    await wrapper.get('#closure-password').setValue('fixture-password');
    await wrapper.get('#closure-confirmation').setValue('注销');
    expect(button(wrapper, '注销账号').element.hasAttribute('disabled')).toBe(
      false,
    ); // 页面入口可用
    const confirm = wrapper.findComponent({ name: 'Popconfirm' });
    confirm.vm.$emit('confirm');
    await flushPromises();
    expect(mocks.close).not.toHaveBeenCalled();
    await wrapper.get('#closure-confirmation').setValue('注销账号');
    mocks.close.mockRejectedValueOnce(
      new Error('fixture verification failure'),
    );
    confirm.vm.$emit('confirm');
    await flushPromises();
    expect(mocks.close).toHaveBeenCalledWith({
      confirmation: '注销账号',
      password: 'fixture-password',
      wechatScene: undefined,
      wechatBrowserSecret: undefined,
    });
    expect(
      (wrapper.get('#closure-password').element as HTMLInputElement).value,
    ).toBe('fixture-password');
    expect(
      (wrapper.get('#closure-confirmation').element as HTMLInputElement).value,
    ).toBe('注销账号');
    expect(mocks.finish).not.toHaveBeenCalled();
  });
  it('提交期间去重，只在受理成功后清理会话', async () => {
    const wrapper = await open();
    await wrapper.get('#closure-password').setValue('fixture-password');
    await wrapper.get('#closure-confirmation').setValue('注销账号');
    let resolve!: () => void;
    mocks.close.mockImplementationOnce(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const confirm = wrapper.findComponent({ name: 'Popconfirm' });
    confirm.vm.$emit('confirm');
    confirm.vm.$emit('confirm');
    await flushPromises();
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.finish).not.toHaveBeenCalled();
    resolve();
    await flushPromises();
    expect(mocks.finish).toHaveBeenCalledTimes(1);
    expect(wrapper.find('#closure-password').exists()).toBe(false);
  });
  it('无密码账号使用一次性微信扫码确认，不传目标用户ID', async () => {
    mocks.getUser.mockResolvedValueOnce({
      id: '9223372036854775807',
      hasPassword: false,
      wechatBound: true,
    });
    const wrapper = await open();
    await wrapper.get('#closure-confirmation').setValue('注销账号');
    wrapper
      .findComponent({ name: 'ClosureWechatVerification' })
      .vm.$emit('verified', {
        scene: 'fixture-scene',
        browserSecret: 'fixture-secret',
      });
    await flushPromises();
    wrapper.findComponent({ name: 'Popconfirm' }).vm.$emit('confirm');
    await flushPromises();
    expect(mocks.close).toHaveBeenCalledWith({
      confirmation: '注销账号',
      password: undefined,
      wechatScene: 'fixture-scene',
      wechatBrowserSecret: 'fixture-secret',
    });
    expect(mocks.finish).toHaveBeenCalledOnce();
  });
});
