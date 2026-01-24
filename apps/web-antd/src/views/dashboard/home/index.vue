<script lang="ts" setup>
import { onMounted, onUnmounted, ref, type Component } from 'vue';
import { useRouter } from 'vue-router';

import {
  WorkbenchQuickNav,
  type WorkbenchQuickNavItem,
} from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import {
  getDashboardCardDetail,
  getDashboardTasks,
} from '#/api/core/dashboard';
import { getGithubCardInfo } from '#/api/core/github';
import { getShanbayCardInfo } from '#/api/core/shanbay';

import AnalysisCard from './components/analysis-card.vue';

interface OverviewItem {
  icon: Component | string;
  iconClickUrl?: string;
  title: string;
  titleClickUrl?: string;
  totalTitle?: string;
  totalValue?: number | string;
  value?: number | string;
  valueColor?: string;
  loading?: boolean;
  type?: string;
  refreshInterval?: number;
}

const overviewItems = ref<OverviewItem[]>([]);
const loading = ref(true);
const userStore = useUserStore();

// 定时器管理
const refreshTimers = new Map<string, ReturnType<typeof setInterval>>();

function clearCardTimer(type?: string) {
  if (type && refreshTimers.has(type)) {
    clearInterval(refreshTimers.get(type));
    refreshTimers.delete(type);
  }
}

function setupCardRefresh(item: OverviewItem) {
  const { type, refreshInterval } = item;
  if (!type) return;

  // 清除旧定时器
  clearCardTimer(type);

  // 负数、空值或 0 时不设置定时刷新
  if (
    refreshInterval === undefined ||
    refreshInterval === null ||
    refreshInterval <= 0
  ) {
    return;
  }

  // 设置新定时器
  const timer = setInterval(() => {
    refreshCard(item);
  }, refreshInterval * 1000);

  refreshTimers.set(type, timer);
}

onUnmounted(() => {
  // 清理所有定时器
  refreshTimers.forEach((timer) => clearInterval(timer));
  refreshTimers.clear();
});

// 获取数据并设置 overviewItems
onMounted(async () => {
  try {
    loading.value = true;
    
    // 1. 获取任务列表
    const tasks = await getDashboardTasks();
    
    const items: OverviewItem[] = [];
    
    // 2. 构建初始列表（占位符）
    tasks.forEach((task) => {
      items.push({
        title: task.title,
        type: task.type,
        loading: true,
        icon: task.icon,
        totalTitle: task.totalTitle,
        totalValue: '',
        value: '',
      });
    });

    // Github 占位
    if (userStore.userInfo?.githubUsername) {
      items.push({
        title: 'GitHub',
        type: 'GITHUB',
        loading: true,
        icon: 'carbon:logo-github',
        totalTitle: '连续提交',
        totalValue: '',
        value: '',
      });
    }

    // 扇贝占位
    if (userStore.userInfo?.shanbayAcct) {
      items.push({
        title: '扇贝单词',
        type: 'SHANBAY',
        loading: true,
        icon: 'lucide:book-open',
        totalTitle: '今日学习时间',
        totalValue: '',
        value: '',
      });
    }

    overviewItems.value = items;
    loading.value = false;

    // 3. 并发获取详情
    
    // Dashboard Cards
    tasks.forEach(async (task) => {
      try {
        const res = await getDashboardCardDetail(task.type);
        const index = overviewItems.value.findIndex((i) => i.type === task.type);
        if (index !== -1) {
          overviewItems.value[index] = {
            ...overviewItems.value[index],
            ...res,
            loading: false,
          };
          setupCardRefresh(overviewItems.value[index]);
        }
      } catch (error) {
        console.error(`Failed to fetch card ${task.type}`, error);
      }
    });

    // Github
    if (userStore.userInfo?.githubUsername) {
      getGithubCardInfo(
        userStore.userInfo.githubUsername,
        userStore.userInfo.githubToken,
      )
        .then((res) => {
          const index = overviewItems.value.findIndex((i) => i.type === 'GITHUB');
          if (index !== -1) {
            overviewItems.value[index] = {
              ...overviewItems.value[index],
              ...res,
              loading: false,
            };
            setupCardRefresh(overviewItems.value[index]);
          }
        })
        .catch((err) => console.error('Github fetch failed', err));
    }

    // Shanbay
    if (userStore.userInfo?.shanbayAcct) {
      getShanbayCardInfo(userStore.userInfo.shanbayAcct)
        .then((res) => {
          const index = overviewItems.value.findIndex((i) => i.type === 'SHANBAY');
          if (index !== -1) {
            overviewItems.value[index] = {
              ...overviewItems.value[index],
              ...res,
              loading: false,
            };
            setupCardRefresh(overviewItems.value[index]);
          }
        })
        .catch((err) => console.error('Shanbay fetch failed', err));
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    loading.value = false;
  }
});

async function refreshCard(item: OverviewItem) {
  if (item.loading || !item.type) {
    return;
  }

  try {
    item.loading = true;
    let res = {};

    if (item.type === 'GITHUB') {
      if (userStore.userInfo?.githubUsername) {
        res = await getGithubCardInfo(
          userStore.userInfo.githubUsername,
          userStore.userInfo.githubToken,
        );
      }
    } else if (item.type === 'SHANBAY') {
      if (userStore.userInfo?.shanbayAcct) {
        res = await getShanbayCardInfo(userStore.userInfo.shanbayAcct);
      }
    } else {
      res = await getDashboardCardDetail(item.type);
    }

    Object.assign(item, res, { loading: false });
    setupCardRefresh(item);
  } catch (error) {
    console.error(`Failed to refresh card ${item.title}`, error);
    item.loading = false;
  }
}

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
  <div class="p-3 sm:p-5">
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <template v-if="loading && overviewItems.length === 0">
        <AnalysisCard v-for="i in 4" :key="i" loading />
      </template>
      <template v-else>
        <AnalysisCard
          v-for="item in overviewItems"
          :key="item.type || item.title"
          :loading="item.loading"
          :icon="item.icon"
          :icon-click-url="item.iconClickUrl"
          :title="item.title"
          :title-click-url="item.titleClickUrl"
          :total-title="item.totalTitle"
          :total-value="item.totalValue"
          :value="item.value"
          :value-color="item.valueColor"
          class="cursor-pointer"
          @click="refreshCard(item)"
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
