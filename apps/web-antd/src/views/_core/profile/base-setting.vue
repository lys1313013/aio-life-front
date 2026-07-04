<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';
import type { UpdateUserParams } from '#/api/core/user';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  getUserInfoApi,
  updateUserInfoApi,
  uploadAvatarApi,
} from '#/api/core/user';
import { useAuthStore } from '#/store/auth';

const authStore = useAuthStore();
const profileBaseSettingRef = ref();

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const url = await uploadAvatarApi(formData);
        message.success('头像上传成功');
        const data = await authStore.fetchUserInfo();
        const fileList = [{ name: 'avatar.png', status: 'done', uid: '-1', url }];
        profileBaseSettingRef.value
          .getFormApi()
          .setValues({ ...data, avatar: fileList });
      } catch {
        message.error('头像上传失败');
      }
      return;
    }
  }
};

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
    if (
      values.avatar &&
      Array.isArray(values.avatar) &&
      values.avatar.length > 0
    ) {
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
  <div @paste="handlePaste">
    <ProfileBaseSetting
      ref="profileBaseSettingRef"
      class="max-w-lg"
      :form-schema="formSchema"
      @submit="handleSubmit"
    />
  </div>
</template>

<style scoped>
:deep(.avatar-upload .ant-upload-select) {
  overflow: hidden;
  border-radius: 50% !important;
}
</style>
