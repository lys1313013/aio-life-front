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
import { getShanbayCardInfo } from '#/api/core/shanbay';
import {
  ACTION_OPEN_EXERCISE_MODAL,
  ACTION_OPEN_TIME_TRACKER_MODAL,
} from '#/constants/action';

import ExerciseAddModal from '../../my-hub/exercise/components/ExerciseAddModal.vue';
import TimeTrackerAddModal from '../../my-hub/time-tracker/components/TimeTrackerAddModal.vue';
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
const timeTrackerModalRef = ref();
const exerciseModalRef = ref();
const longPressTimer = ref<ReturnType<typeof setTimeout>>();
const isLongPress = ref(false);

// 定时器管理
const refreshTimers = new Map<string, ReturnType<typeof setInterval>>();

function startLongPress(item: OverviewItem) {
  const isTimeTracker = item.title === '时迹' || item.type === 'TIME_TRACKER';
  const isExercise = item.title === '运动' || item.type === 'EXERCISE';

  if (!isTimeTracker && !isExercise) return;

  isLongPress.value = false;
  longPressTimer.value = setTimeout(() => {
    isLongPress.value = true;
    if (isTimeTracker) {
      timeTrackerModalRef.value?.open();
    } else if (isExercise) {
      exerciseModalRef.value?.open();
    }
    // 震动反馈
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, 200);
}

function endLongPress() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = undefined;
  }
}

function cancelLongPress() {
  endLongPress();
}

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

  // 如果页面不可见，或者没有设置刷新间隔，则不设置定时器
  if (
    document.visibilityState === 'hidden' ||
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

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // 切换回前台时，刷新所有有刷新间隔的卡片
    overviewItems.value.forEach((item) => {
      if (item.refreshInterval && item.refreshInterval > 0) {
        refreshCard(item);
      }
    });
  } else {
    // 切换到后台时，清除所有定时器
    refreshTimers.forEach((timer) => clearInterval(timer));
    refreshTimers.clear();
  }
}

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  // 清理所有定时器
  refreshTimers.forEach((timer) => clearInterval(timer));
  refreshTimers.clear();
});

// 获取数据并设置 overviewItems
onMounted(async () => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
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

    if (item.type === 'SHANBAY') {
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

function handleCardClick(item: OverviewItem) {
  if (isLongPress.value) {
    isLongPress.value = false;
    return;
  }
  refreshCard(item);
}

function handleTitleClick(url: string) {
  if (url === ACTION_OPEN_TIME_TRACKER_MODAL) {
    timeTrackerModalRef.value?.open();
  } else if (url === ACTION_OPEN_EXERCISE_MODAL) {
    exerciseModalRef.value?.open();
  }
}

function handleTimeTrackerSuccess() {
  overviewItems.value.forEach((item) => {
    if (
      item.titleClickUrl === ACTION_OPEN_TIME_TRACKER_MODAL ||
      item.iconClickUrl === ACTION_OPEN_TIME_TRACKER_MODAL
    ) {
      refreshCard(item);
    }
  });
}

function handleExerciseSuccess() {
  overviewItems.value.forEach((item) => {
    if (
      item.titleClickUrl === ACTION_OPEN_EXERCISE_MODAL ||
      item.iconClickUrl === ACTION_OPEN_EXERCISE_MODAL
    ) {
      refreshCard(item);
    }
  });
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
    url: '/task-center/todo',
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

function handleQuickNavLongPress(nav: WorkbenchQuickNavItem) {
  if (nav.title === '时迹' || nav.url?.includes('time-tracker')) {
    timeTrackerModalRef.value?.open();
  } else if (nav.title === '运动' || nav.url?.includes('exercise')) {
    exerciseModalRef.value?.open();
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
          @click="handleCardClick(item)"
          @mousedown="startLongPress(item)"
          @touchstart="startLongPress(item)"
          @mouseup="endLongPress"
          @touchend="endLongPress"
          @mouseleave="cancelLongPress"
          @touchmove="cancelLongPress"
          @title-click="handleTitleClick"
        />
      </template>
    </div>
    <div class="mt-5 flex flex-col lg:flex-row">
      <div class="w-full">
        <WorkbenchQuickNav
          :items="quickNavItems"
          title="快捷导航"
          @click="navTo"
          @long-press="handleQuickNavLongPress"
        />
      </div>
    </div>
    <TimeTrackerAddModal
      ref="timeTrackerModalRef"
      @success="handleTimeTrackerSuccess"
    />
    <ExerciseAddModal
      ref="exerciseModalRef"
      @success="handleExerciseSuccess"
    />
  </div>
</template>
