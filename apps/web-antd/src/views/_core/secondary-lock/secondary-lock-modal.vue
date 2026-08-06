<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { InputPassword, Modal, message } from 'ant-design-vue';

import { secondaryVerifyApi } from '#/api/core/auth';
import { useSecondaryLockStore } from '#/store/secondary-lock';

defineOptions({ name: 'SecondaryLockModal' });

const router = useRouter();
const store = useSecondaryLockStore();
const password = ref('');
const loading = ref(false);

watch(
  () => store.showModal,
  (visible) => {
    if (visible) {
      password.value = '';
    }
  },
);

async function handleSubmit() {
  const menuPath = store.pendingTargetPath;
  if (!menuPath || !password.value) return;

  loading.value = true;
  try {
    await secondaryVerifyApi({ password: password.value, menuPath });
    store.unlock(menuPath);
    message.success('验证成功');
    await router.push(menuPath);
  } catch (error: any) {
    message.error(error?.message || '二级密码错误');
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  store.cancelUnlock();
}
</script>

<template>
  <Modal
    :centered="true"
    :closable="false"
    :confirm-loading="loading"
    :mask-closable="false"
    :open="store.showModal"
    :title="'菜单锁验证'"
    cancel-text="取消"
    ok-text="确认解锁"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <div class="py-4">
      <p class="text-muted-foreground mb-4 text-sm">
        当前菜单已被菜单锁锁定，请输入二级密码解锁
      </p>
      <InputPassword
        v-model:value="password"
        placeholder="请输入二级密码"
        @keydown.enter="handleSubmit"
      />
    </div>
  </Modal>
</template>
