<script setup lang="ts">
import type { BasicOption } from '@vben/types';

import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { message } from 'ant-design-vue';

import { getUserInfoApi, type UpdateUserParams, updateUserInfoApi } from '#/api';
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
      fieldName: 'nickname',
      component: 'Input',
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
    await updateUserInfoApi(values as UpdateUserParams);
    message.success('更新成功');
    const data = await authStore.fetchUserInfo();
    profileBaseSettingRef.value.getFormApi().setValues(data);
  } catch (error) {
    console.error(error);
  }
};

onMounted(async () => {
  const data = await getUserInfoApi();
  profileBaseSettingRef.value.getFormApi().setValues(data);
});
</script>
<template>
  <ProfileBaseSetting
    ref="profileBaseSettingRef"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
