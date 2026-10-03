import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';

import BaseSetting from './base-setting.vue';

const state = vi.hoisted(() => ({
  getUserInfoApi: vi.fn(),
  updateUserInfoApi: vi.fn(),
  uploadAvatarApi: vi.fn(),
  fetchUserInfo: vi.fn(),
  form: { setValues: vi.fn(), setFieldValue: vi.fn() },
}));
vi.mock('#/api/core/user', () => state);
vi.mock('#/store/auth', () => ({ useAuthStore: () => state }));
vi.mock('@vben/common-ui', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    ProfileBaseSetting: defineComponent({
      name: 'ProfileBaseSetting',
      props: ['formSchema', 'loading'],
      emits: ['submit'],
      setup(_, { expose }) {
        expose({ getFormApi: () => state.form });
        return () => h('div');
      },
    }),
  };
});
vi.mock('ant-design-vue', () => ({ message: { error: vi.fn() } }));

const id = '0123456789abcdef0123456789abcdef';
const url = 'https://example.test/api/file/preview/' + id;
const profile = {
  nickname: '测试用户',
  introduction: '简介',
  avatarFileId: id,
  avatarUrl: url,
};
beforeEach(() => {
  vi.clearAllMocks();
  state.getUserInfoApi.mockResolvedValue(profile);
  state.fetchUserInfo.mockResolvedValue(profile);
  state.updateUserInfoApi.mockResolvedValue(null);
  state.uploadAvatarApi.mockResolvedValue({ id, fileUrl: url });
});

it('上传响应保留文件 ID，保存只提交 avatarFileId，移除项发送 null', async () => {
  const wrapper = mount(BaseSetting);
  await flushPromises();
  const form = wrapper.findComponent({ name: 'ProfileBaseSetting' });
  const schema = form
    .props('formSchema')
    .find((field: { fieldName: string }) => field.fieldName === 'avatarFiles');
  const success = vi.fn();
  await schema.componentProps.customRequest({
    file: new File(['fixture'], 'avatar.png'),
    onSuccess: success,
    onError: vi.fn(),
  });
  expect(success.mock.calls[0]?.[0]).toEqual({ id, fileUrl: url });
  form.vm.$emit('submit', {
    nickname: '新昵称',
    introduction: '新简介',
    avatarFiles: [{ status: 'done', response: success.mock.calls[0]?.[0] }],
  });
  await flushPromises();
  expect(state.updateUserInfoApi).toHaveBeenLastCalledWith({
    nickname: '新昵称',
    introduction: '新简介',
    avatarFileId: id,
  });
  form.vm.$emit('submit', {
    nickname: '新昵称',
    introduction: '新简介',
    avatarFiles: [],
  });
  await flushPromises();
  expect(state.updateUserInfoApi).toHaveBeenLastCalledWith({
    nickname: '新昵称',
    introduction: '新简介',
    avatarFileId: null,
  });
  wrapper.unmount();
});

it('粘贴图片仅更新头像上传项，不重载覆盖尚未保存的昵称和简介', async () => {
  const wrapper = mount(BaseSetting);
  await flushPromises();
  state.form.setValues.mockClear();
  await wrapper.trigger('paste', {
    clipboardData: {
      items: [
        {
          type: 'image/png',
          getAsFile: () => new File(['fixture'], 'pasted.png'),
        },
      ],
    },
  });
  await flushPromises();
  expect(state.form.setFieldValue).toHaveBeenCalledWith(
    'avatarFiles',
    expect.arrayContaining([
      expect.objectContaining({ response: { id, fileUrl: url } }),
    ]),
  );
  expect(state.fetchUserInfo).not.toHaveBeenCalled();
  expect(state.form.setValues).not.toHaveBeenCalled();
  wrapper.unmount();
});
