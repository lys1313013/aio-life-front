<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ApiKeySetting from './api-key-setting.vue';
import ProfileBase from './base-setting.vue';
import CbtiSetting from './cbti-setting.vue';
import LLMSetting from './llm-setting.vue';
import MbtiSetting from './mbti-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import SecondaryPasswordSetting from './secondary-password-setting.vue';
import SystemSetting from './system-setting.vue';
import UserBindSetting from './user-bind.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const tabsValue = ref<string>((route.query.tab as string) || 'basic');

watch(tabsValue, (val) => {
  router.replace({ query: { ...route.query, tab: val } });
});

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
    label: '二级密码',
    value: 'secondary-password',
  },
  {
    label: 'API Key',
    value: 'api-key',
  },
  {
    label: '大模型配置',
    value: 'llm',
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
      <ApiKeySetting v-if="tabsValue === 'api-key'" />
      <LLMSetting v-if="tabsValue === 'llm'" />
      <MbtiSetting v-if="tabsValue === 'mbti'" />
      <CbtiSetting v-if="tabsValue === 'cbti'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
      <SystemSetting v-if="tabsValue === 'system'" />
    </template>
  </Profile>
</template>
