<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  getUserInfoApi,
  updateUserInfoApi,
  uploadAvatarApi,
} from '#/api/core/user';
import { useAuthStore } from '#/store/auth';

import { avatarFileList, avatarProfilePayload } from './avatar-settings';

const authStore = useAuthStore();
const profileBaseSettingRef = ref();
const saving = ref(false);
const uploading = ref(0);
const ready = ref(false);

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      if (saving.value || uploading.value || !ready.value) return;
      uploading.value++;
      try {
        const uploaded = await uploadAvatarApi(file);
        profileBaseSettingRef.value
          .getFormApi()
          .setFieldValue(
            'avatarFiles',
            avatarFileList({
              avatarFileId: uploaded.id,
              avatarUrl: uploaded.fileUrl,
            }),
          );
      } catch {
        // 请求错误由全局拦截器提示，保留原表单。
      } finally {
        uploading.value--;
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
          uploading.value++;
          try {
            const uploaded = await uploadAvatarApi(file);
            const url = uploaded.fileUrl;
            file.url = url;
            onSuccess(uploaded, file);
          } catch (error) {
            onError(error);
          } finally {
            uploading.value--;
          }
        },
        listType: 'picture-card',
        maxCount: 1,
        class: 'avatar-upload',
        rounded: true,
      },
      fieldName: 'avatarFiles',
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
  if (saving.value || uploading.value || !ready.value) return;
  let payload;
  try {
    payload = avatarProfilePayload(values);
  } catch (error) {
    message.error((error as Error).message);
    return;
  }
  saving.value = true;
  try {
    await updateUserInfoApi(payload);
    const data = await authStore.fetchUserInfo();
    profileBaseSettingRef.value
      .getFormApi()
      .setValues({ ...data, avatarFiles: avatarFileList(data) });
  } catch {
    // 请求错误由全局拦截器提示，保留原表单以便重试。
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  saving.value = true;
  try {
    const data = await getUserInfoApi();
    profileBaseSettingRef.value
      .getFormApi()
      .setValues({ ...data, avatarFiles: avatarFileList(data) });
    ready.value = true;
  } finally {
    saving.value = false;
  }
});
</script>
<template>
  <div @paste="handlePaste">
    <ProfileBaseSetting
      ref="profileBaseSettingRef"
      class="max-w-lg"
      :form-schema="formSchema"
      :loading="saving || uploading > 0"
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
