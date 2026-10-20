<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ProfileBase from './base-setting.vue';
import CbtiSetting from './cbti-setting.vue';
import HomeCardSetting from './home-card-setting.vue';
import MbtiSetting from './mbti-setting.vue';
import MenuDisplaySetting from './menu-display-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import SecondaryPasswordSetting from './secondary-password-setting.vue';
import UserBindSetting from './user-bind.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const tabs = ref([
  {
    label: '基本设置',
    value: 'basic',
  },
  {
    label: '账号绑定',
    value: 'bind',
  },
  {
    label: '修改密码',
    value: 'password',
  },
  {
    label: '菜单显示',
    value: 'menu-display',
  },
  {
    label: '首页卡片',
    value: 'home-cards',
  },
  {
    label: '菜单锁',
    value: 'secondary-password',
  },
  {
    label: 'MBTI测试',
    value: 'mbti',
  },
  {
    label: 'CBTI测试',
    value: 'cbti',
  },
  {
    label: '通知设置',
    value: 'notice',
  },
]);
const requestedTab = route.query.tab;
const tabsValue = ref(
  tabs.value.find((tab) => tab.value === requestedTab)?.value || 'basic',
);

const redirectPath = computed(() => {
  if (route.query.tab === 'api-key') return '/mcp/api-keys';
  if (route.query.tab === 'body-profile') return '/record/body-profile';
  return '';
});

watch(
  redirectPath,
  (path) => {
    if (path) void router.replace(path);
  },
  { immediate: true },
);

watch(
  tabsValue,
  (val) => {
    if (!redirectPath.value && route.query.tab !== val) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', val);
      window.history.replaceState({}, '', url.toString());
    }
  },
  { immediate: true },
);
</script>
<template>
  <Profile
    v-if="!redirectPath"
    v-model:model-value="tabsValue"
    title="个人中心"
    :user-info="userStore.userInfo"
    :tabs="tabs"
  >
    <template #content>
      <ProfileBase v-if="tabsValue === 'basic'" />
      <UserBindSetting v-if="tabsValue === 'bind'" />
      <ProfilePasswordSetting v-if="tabsValue === 'password'" />
      <SecondaryPasswordSetting v-if="tabsValue === 'secondary-password'" />
      <MenuDisplaySetting v-if="tabsValue === 'menu-display'" />
      <HomeCardSetting v-if="tabsValue === 'home-cards'" />
      <MbtiSetting v-if="tabsValue === 'mbti'" />
      <CbtiSetting v-if="tabsValue === 'cbti'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
    </template>
  </Profile>
</template>
