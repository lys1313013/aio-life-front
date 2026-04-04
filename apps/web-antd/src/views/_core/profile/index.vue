<script setup lang="ts">
import { ref } from 'vue';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ApiKeySetting from './api-key-setting.vue';
import ProfileBase from './base-setting.vue';
import LLMSetting from './llm-setting.vue';
import MbtiSetting from './mbti-setting.vue';
import ProfileNotificationSetting from './notification-setting.vue';
import ProfilePasswordSetting from './password-setting.vue';
import UserBindSetting from './user-bind.vue';

const userStore = useUserStore();

const tabsValue = ref<string>('basic');

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
  // {
  //   label: '新消息提醒',
  //   value: 'notice',
  // },
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
      <ApiKeySetting v-if="tabsValue === 'api-key'" />
      <LLMSetting v-if="tabsValue === 'llm'" />
      <MbtiSetting v-if="tabsValue === 'mbti'" />
      <ProfileNotificationSetting v-if="tabsValue === 'notice'" />
    </template>
  </Profile>
</template>
