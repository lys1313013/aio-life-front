<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getSecondaryPasswordStatusApi,
  setSecondaryPasswordApi,
} from '#/api/core/auth';

const hasPassword = ref(false);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await getSecondaryPasswordStatusApi();
    hasPassword.value = res.hasPassword;
  } finally {
    loading.value = false;
  }
});

const formSchema = computed((): VbenFormSchema[] => {
  const fields: VbenFormSchema[] = [];

  if (hasPassword.value) {
    fields.push({
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请输入旧二级密码' },
      fieldName: 'oldPassword',
      label: '旧二级密码',
      rules: 'required',
    });
  }

  fields.push(
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请输入新二级密码' },
      fieldName: 'password',
      label: hasPassword.value ? '新二级密码' : '二级密码',
      rules: 'required',
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: '请再次输入' },
      fieldName: 'confirmPassword',
      label: '确认密码',
      rules: 'required',
    },
  );

  return fields;
});

async function handleSubmit(values: any) {
  if (values.password !== values.confirmPassword) {
    message.error('两次输入的密码不一致');
    return;
  }
  try {
    await setSecondaryPasswordApi({
      oldPassword: values.oldPassword,
      password: values.password,
    });
    message.success(hasPassword.value ? '二级密码修改成功' : '二级密码设置成功');
    hasPassword.value = true;
  } catch (error: any) {
    message.error(error?.message || '操作失败');
  }
}
</script>

<template>
  <div class="max-w-lg">
    <a-spin :spinning="loading">
      <a-alert
        v-if="!hasPassword && !loading"
        class="mb-4"
        message="尚未设置二级密码，设置后可保护敏感菜单"
        type="info"
        show-icon
      />
      <vben-form
        :key="String(hasPassword)"
        :schema="formSchema"
        @submit="handleSubmit"
      >
        <template #default="defaultProps">
          <a-space class="w-full" direction="vertical" size="large">
            <template
              v-for="(commonComponent, name) in defaultProps.commonComponent"
              :key="name"
            >
              <component :is="commonComponent" />
            </template>
          </a-space>
        </template>
      </vben-form>
    </a-spin>
  </div>
</template>
