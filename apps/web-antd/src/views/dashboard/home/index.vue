<script lang="ts" setup>
import { onMounted, ref, type Component } from 'vue';
import { useRouter } from 'vue-router';

import {
  WorkbenchQuickNav,
  type WorkbenchQuickNavItem,
} from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import { getDashboardCard } from '#/api/core/dashboard';
import { getGithubCardInfo } from '#/api/core/github';

import AnalysisCard from './components/analysis-card.vue';

interface OverviewItem {
  icon: Component | string;
  title: string;
  totalTitle: string;
  totalValue: number | string;
  url?: string;
  value: number | string;
  valueColor?: string;
}

const overviewItems = ref<OverviewItem[]>([]);
const loading = ref(true);
const userStore = useUserStore();

// 获取数据并设置 overviewItems
onMounted(async () => {
  try {
    loading.value = true;
    const [dashboardRes, githubRes] = await Promise.allSettled([
      getDashboardCard({}),
      userStore.userInfo?.githubUsername && userStore.userInfo?.githubToken
        ? getGithubCardInfo(
            userStore.userInfo.githubUsername,
            userStore.userInfo.githubToken,
          )
        : Promise.reject('No github credentials'),
    ]);

    const items: OverviewItem[] = [];
    if (dashboardRes.status === 'fulfilled') {
      items.push(...dashboardRes.value);
    }

    if (githubRes.status === 'fulfilled') {
      items.push(githubRes.value);
    }

    overviewItems.value = items;
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
  } finally {
    loading.value = false;
  }
});

const quickNavItems: WorkbenchQuickNavItem[] = [
  {
    color: '#1fdaca',
    icon: 'mdi:history',
    title: '时迹',
    url: '/my-hub/time-tracker',
  },
  {
    color: '#bf0c2c',
    icon: 'mdi:run-fast',
    title: '运动',
    url: '/my-hub/exercise',
  },
  {
    color: '#e18525',
    icon: 'mdi:clipboard-text-clock-outline',
    title: '待办',
    url: '/my-hub/todo',
  },
  {
    color: '#3fb27f',
    icon: 'mdi:lightbulb-on-outline',
    title: '闪念',
    url: '/my-hub/think',
  },
  {
    color: '#1f2328',
    icon: 'carbon:logo-github',
    title: 'GitHub',
    url: '/coding/github',
  },
  {
    color: '#ffa116',
    icon: 'devicon:leetcode',
    title: 'LeetCode',
    url: '/coding/leetcode',
  },
];

const router = useRouter();

function navTo(nav: WorkbenchQuickNavItem) {
  if (nav.url?.startsWith('http')) {
    openWindow(nav.url);
    return;
  }
  if (nav.url) {
    router.push(nav.url);
  }
}
</script>

<template>
  <div class="p-5">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <template v-if="loading">
        <AnalysisCard v-for="i in 4" :key="i" loading />
      </template>
      <template v-else>
        <AnalysisCard
          v-for="item in overviewItems"
          :key="item.title"
          :icon="item.icon"
          :title="item.title"
          :total-title="item.totalTitle"
          :total-value="item.totalValue"
          :url="item.url"
          :value="item.value"
          :value-color="item.valueColor"
        />
      </template>
    </div>
    <div class="mt-5 flex flex-col lg:flex-row">
      <div class="w-full">
        <WorkbenchQuickNav
          :items="quickNavItems"
          title="快捷导航"
          @click="navTo"
        />
      </div>
    </div>
  </div>
</template>
