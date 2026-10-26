<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';

import { secondaryVerifyApi } from '#/api/core/auth';
import { AppModal as Modal } from '#/components/app-modal';
import NumericPasswordPad from '#/components/NumericPasswordPad.vue';
import SecondaryPasswordEditor from '#/components/SecondaryPasswordEditor.vue';
import { useSecondaryLockStore } from '#/store/secondary-lock';

defineOptions({ name: 'SecondaryLockModal' });
const router = useRouter();
const store = useSecondaryLockStore();
const access = useAccessStore();
const loading = ref(false);
const password = ref('');
const recoveryOpen = ref(false);
let revision = 0;
watch(
  () => [store.showModal, store.pendingTargetPath, access.accessToken],
  () => {
    revision++;
    password.value = '';
    loading.value = false;
    if (!store.showModal) recoveryOpen.value = false;
  },
);
onBeforeUnmount(() => {
  revision++;
  password.value = '';
});
async function handleSubmit() {
  const menuPath = store.pendingTargetPath;
  if (loading.value || !menuPath || !/^\d{4,}$/.test(password.value)) return;
  const navigate = store.navigateAfterUnlock;
  const version = revision;
  loading.value = true;
  try {
    await secondaryVerifyApi({ password: password.value, menuPath });
    if (version !== revision || !store.showModal) return;
    store.unlock(menuPath);
    password.value = '';
    if (navigate) await router.push(menuPath);
  } catch {
    /* 由请求客户端提示；失败时保留输入。 */
  } finally {
    if (version === revision) loading.value = false;
  }
}
function recover() {
  password.value = '';
  recoveryOpen.value = true;
}
</script>
<template>
  <Modal
    :open="store.showModal && !recoveryOpen"
    :busy="loading"
    :width="320"
    :footer="false"
    :body-style="{ padding: '16px' }"
    title="二级密码"
    @cancel="store.cancelUnlock"
  >
    <NumericPasswordPad
      v-model:value="password"
      :busy="loading"
      recovery
      @submit="handleSubmit"
      @recover="recover"
    />
  </Modal>
  <SecondaryPasswordEditor v-model:open="recoveryOpen" mode="recovery" />
</template>
