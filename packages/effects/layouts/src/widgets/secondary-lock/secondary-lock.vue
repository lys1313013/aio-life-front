<script setup lang="ts">
import { useRouter } from 'vue-router';

import { message } from 'ant-design-vue';

import { secondaryVerifyApi } from '#/api/core/auth';
import { useSecondaryLockStore } from '#/store/secondary-lock';

import SecondaryLockModal from './secondary-lock-modal.vue';

defineOptions({ name: 'SecondaryLock' });

const router = useRouter();
const store = useSecondaryLockStore();

async function handleSubmit(password: string) {
  const menuPath = store.pendingTargetPath;
  if (!menuPath) return;

  try {
    await secondaryVerifyApi({ password, menuPath });
    store.unlock(menuPath);
    message.success('验证成功');
    await router.push(menuPath);
  } catch (error: any) {
    message.error(error?.message || '二级密码错误');
  }
}

function handleCancel() {
  store.cancelUnlock();
}
</script>

<template>
  <SecondaryLockModal
    v-model:open="store.showModal"
    @submit="handleSubmit"
  />
</template>
