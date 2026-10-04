<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ApiKeySetting from './api-key-setting.vue';
import ProfileBase from './base-setting.vue';
import CbtiSetting from './cbti-setting.vue';
import HomeCardSetting from './home-card-setting.vue';
import MbtiSetting from './mbti-setting.vue';
import MenuDisplaySetting from './menu-display-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import SecondaryPasswordSetting from './secondary-password-setting.vue';
import SystemSetting from './system-setting.vue';
import UserBindSetting from './user-bind.vue';

const route = useRoute();
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
    label: 'API Key',
    value: 'api-key',
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
  {
    label: '系统设置',
    value: 'system',
  },
]);
const requestedTab = route.query.tab;
const tabsValue = ref(
  tabs.value.find((tab) => tab.value === requestedTab)?.value || 'basic',
);

watch(
  tabsValue,
  (val) => {
    if (route.query.tab !== val) {
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
      <ApiKeySetting v-if="tabsValue === 'api-key'" />
      <MbtiSetting v-if="tabsValue === 'mbti'" />
      <CbtiSetting v-if="tabsValue === 'cbti'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
      <SystemSetting v-if="tabsValue === 'system'" />
    </template>
  </Profile>
</template>
