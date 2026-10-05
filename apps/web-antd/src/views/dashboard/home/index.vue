<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

import { useUserStore } from '@vben/stores';

import { Button, Skeleton } from 'ant-design-vue';

import { useHomeCardsStore } from '#/store/home-cards';

import HomeContent from './home-content.vue';

const preferences = useHomeCardsStore();
const user = useUserStore();
const active = ref(true);
const initialized = ref(false);
const contentKey = computed(() =>
  JSON.stringify([
    user.userInfo?.userId || user.userInfo?.id,
    preferences.items.map((item) => [
      item.cardKey,
      item.enabled,
      item.sortOrder,
    ]),
  ]),
);
let pending: null | Promise<void> = null;
function refreshPreferences() {
  if (pending) return pending;
  pending = preferences.load().finally(() => {
    initialized.value = true;
    pending = null;
  });
  return pending;
}
function visible() {
  if (active.value && document.visibilityState === 'visible')
    void refreshPreferences();
}
onMounted(() => {
  void refreshPreferences();
  document.addEventListener('visibilitychange', visible);
});
onActivated(() => {
  active.value = true;
  void refreshPreferences();
});
onDeactivated(() => {
  active.value = false;
});
onUnmounted(() => document.removeEventListener('visibilitychange', visible));
</script>
<template>
  <div>
    <div
      v-if="preferences.error"
      class="flex items-center gap-3 p-4"
      role="alert"
    >
      <span>首页设置加载失败</span
      ><Button :loading="preferences.loading" @click="refreshPreferences">
        重试
      </Button>
    </div>
    <Skeleton
      v-if="!initialized || (!preferences.ready && preferences.loading)"
      active
      class="p-4"
    />
    <HomeContent v-if="initialized && preferences.ready" :key="contentKey" />
  </div>
</template>
