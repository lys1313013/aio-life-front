<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';

import { TabPane, Tabs } from 'ant-design-vue';

const GeneralCategories = defineAsyncComponent(
  () => import('#/views/my-hub/exercise/category-config/index.vue'),
);
const TimeCategories = defineAsyncComponent(
  () => import('#/views/time/time-tracker/category-config/index.vue'),
);
const selected = ref('general');
</script>

<template>
  <Tabs v-model:active-key="selected" aria-label="分类管理">
    <TabPane key="general" tab="通用分类">
      <GeneralCategories v-if="selected === 'general'" embedded />
    </TabPane>
    <TabPane key="time" tab="时迹分类">
      <TimeCategories v-if="selected === 'time'" embedded />
    </TabPane>
  </Tabs>
</template>
