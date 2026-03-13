<script setup lang="ts">
import type { BasicOption } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import {
  getUserInfoApi,
  type UpdateUserParams,
  updateUserInfoApi,
  uploadAvatarApi,
} from '#/api';
import { useAuthStore } from '#/store/auth';

const authStore = useAuthStore();
const profileBaseSettingRef = ref();

const MOCK_ROLES_OPTIONS: BasicOption[] = [
  {
    label: '管理员',
    value: 'super',
  },
  {
    label: '用户',
    value: 'user',
  },
  {
    label: '测试',
    value: 'test',
  },
];

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'Upload',
      componentProps: {
        accept: 'image/*',
        customRequest: async ({ file, onError, onSuccess }: any) => {
          const formData = new FormData();
          formData.append('file', file);
          try {
            const url = await uploadAvatarApi(formData);
            file.url = url;
            onSuccess(url, file);
          } catch (error) {
            onError(error);
          }
        },
        listType: 'picture-card',
        maxCount: 1,
        class: 'avatar-upload',
        rounded: true,
      },
      fieldName: 'avatar',
      label: '头像',
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: '昵称',
    },
    {
      fieldName: 'email',
      component: 'Input',
      label: '邮箱',
      componentProps: {
        disabled: true,
      },
    },
    {
      fieldName: 'introduction',
      component: 'Textarea',
      label: '个人简介',
    },
  ];
});

const handleSubmit = async (values: any) => {
  try {
    if (values.avatar && Array.isArray(values.avatar) && values.avatar.length > 0) {
      values.avatar = values.avatar[0].response || values.avatar[0].url;
    }
    await updateUserInfoApi(values as UpdateUserParams);
    message.success('更新成功');
    const data = await authStore.fetchUserInfo();
    const avatar = data.avatar;
    const fileList = avatar
      ? [{ name: 'avatar.png', status: 'done', uid: '-1', url: avatar }]
      : [];
    profileBaseSettingRef.value
      .getFormApi()
      .setValues({ ...data, avatar: fileList });
  } catch (error) {
    console.error(error);
  }
};

onMounted(async () => {
  const data = await getUserInfoApi();
  const avatar = data.avatar;
  const fileList = avatar
    ? [{ name: 'avatar.png', status: 'done', uid: '-1', url: avatar }]
    : [];
  profileBaseSettingRef.value
    .getFormApi()
    .setValues({ ...data, avatar: fileList });
});
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>

<style scoped>
:deep(.avatar-upload .ant-upload-select) {
  border-radius: 50% !important;
  overflow: hidden;
}
</style>
