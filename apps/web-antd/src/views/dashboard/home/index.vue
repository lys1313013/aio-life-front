<script lang="ts" setup>
import type { Component } from 'vue';

import type { WorkbenchQuickNavItem } from '@vben/common-ui';

import type { WatchedTaskDetail } from '#/api/core/dashboard';

import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { WorkbenchQuickNav } from '@vben/common-ui';
import { openWindow } from '@vben/utils';

import {
  getDashboardCardDetail,
  getDashboardTasks,
  getWatchedTaskDetails,
} from '#/api/core/dashboard';
import { getPinnedThoughts } from '#/api/core/think';
import { updateTaskDetail } from '#/api/core/todo';
import {
  ACTION_OPEN_EXERCISE_MODAL,
  ACTION_OPEN_TIME_TRACKER_MODAL,
} from '#/constants/action';

import ExerciseAddModal from '../../my-hub/exercise/components/ExerciseAddModal.vue';
import TimeTrackerModal from '../../time/time-tracker/components/TimeTrackerModal.vue';
import AnalysisCard from './components/analysis-card.vue';
import WatchedTaskEditModal from './components/WatchedTaskEditModal.vue';

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
const watchedTasks = ref<WatchedTaskDetail[]>([]);
const watchedLoading = ref(true);
const pinnedThoughts = ref<any[]>([]);
const thoughtsLoading = ref(true);
const timeTrackerModalRef = ref();
const exerciseModalRef = ref();
const longPressTimer = ref<ReturnType<typeof setTimeout>>();
const isLongPress = ref(false);

const editTaskModalVisible = ref(false);
const editingWatchedTask = ref<WatchedTaskDetail | null>(null);

function openEditTaskModal(task: WatchedTaskDetail) {
  editingWatchedTask.value = task;
  editTaskModalVisible.value = true;
}

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

async function loadWatchedTasks() {
  try {
    watchedLoading.value = true;
    watchedTasks.value = await getWatchedTaskDetails();
  } catch (error) {
    console.error('获取关注的待办失败:', error);
  } finally {
    watchedLoading.value = false;
  }
}

async function loadPinnedThoughts() {
  try {
    thoughtsLoading.value = true;
    const res = await getPinnedThoughts();
    pinnedThoughts.value = res || [];
  } catch (error) {
    console.error('获取固定的闪念失败:', error);
  } finally {
    thoughtsLoading.value = false;
  }
}

async function handleCompleteTask(detail: WatchedTaskDetail) {
  try {
    await updateTaskDetail({
      id: detail.id,
      isCompleted: 1,
    });
    await loadWatchedTasks();
  } catch (error) {
    console.error('标记完成失败:', error);
  }
}

function getPriorityColor(priority: number): string {
  if (priority === 1) return 'bg-red-500';
  if (priority === 10) return 'bg-orange-500';
  return 'bg-gray-400';
}

function getPriorityLabel(priority: number): string {
  if (priority === 1) return '高';
  if (priority === 10) return '中';
  return '低';
}

function formatTimeRange(startTime?: string, endTime?: string): string {
  if (!startTime && !endTime) return '';
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  if (startTime && endTime) {
    return `${formatDate(startTime)} - ${formatDate(endTime)}`;
  }
  return formatDate(startTime) || formatDate(endTime) || '';
}

function formatThoughtTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}`;
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
    loadWatchedTasks();
    loadPinnedThoughts();
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

    overviewItems.value = items;
    loading.value = false;

    // 3. 并发获取详情

    // Dashboard Cards
    tasks.forEach(async (task) => {
      try {
        const res = await getDashboardCardDetail(task.type);
        const index = overviewItems.value.findIndex(
          (i) => i.type === task.type,
        );
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
    const res = await getDashboardCardDetail(item.type);

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
    url: '/time/time-tracker',
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
    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <WorkbenchQuickNav
        :items="quickNavItems"
        title="快捷导航"
        @click="navTo"
        @long-press="handleQuickNavLongPress"
      />
      <div
        v-if="watchedTasks.length > 0 || !watchedLoading"
        class="flex max-h-[300px] flex-col rounded-xl border border-border bg-card text-card-foreground transition-all"
      >
        <div class="flex items-center justify-between p-4 pb-2">
          <div class="flex items-center gap-2">
            <span
              class="cursor-pointer select-none text-lg font-semibold"
              @click="loadWatchedTasks"
              >待办</span
            >
          </div>
        </div>

        <div v-if="watchedLoading" class="py-10 text-center">
          <div
            class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary"
          ></div>
        </div>

        <div
          v-else-if="watchedTasks.length === 0"
          class="m-4 rounded-xl border border-dashed border-border py-10 text-center"
        >
          <svg
            class="mx-auto mb-2 size-10 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p class="text-sm text-muted-foreground">暂无关注的待办</p>
          <p class="mt-1 text-xs text-muted-foreground">
            在任务详情中点击星标关注
          </p>
        </div>

        <div v-else class="flex-1 space-y-1 overflow-y-auto p-4 pt-2">
          <div
            v-for="(task, index) in watchedTasks"
            :key="task.id"
            class="group relative flex items-center gap-3 rounded-xl p-2.5 transition-all hover:bg-accent hover:text-accent-foreground"
            :style="{ animationDelay: `${index * 50}ms` }"
          >
            <button
              class="flex-shrink-0 rounded border-2 border-border p-0.5 transition-all hover:border-green-500 hover:bg-green-500/10 focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none"
              :class="{
                'border-green-500 bg-green-500 hover:border-green-600 hover:bg-green-600':
                  task.isCompleted === 1,
              }"
              @click="handleCompleteTask(task)"
            >
              <svg
                v-if="task.isCompleted === 1"
                class="size-3 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div v-else class="size-3"></div>
            </button>

            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <span
                v-if="task.priority"
                :class="getPriorityColor(task.priority)"
                class="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              >
                {{ getPriorityLabel(task.priority) }}
              </span>
              <span
                class="cursor-pointer text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary"
                :class="{
                  'text-muted-foreground line-through': task.isCompleted === 1,
                }"
                @click.stop="openEditTaskModal(task)"
              >
                {{ task.content }}
              </span>
              <span
                v-if="task.taskName"
                class="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {{ task.taskName }}
              </span>
              <span
                v-if="task.startTime || task.endTime"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
              >
                <svg
                  class="size-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {{ formatTimeRange(task.startTime, task.endTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 固定闪念 -->
      <div
        v-if="pinnedThoughts.length > 0 || thoughtsLoading"
        class="flex max-h-[300px] flex-col rounded-xl border border-border bg-card text-card-foreground transition-all"
      >
        <div class="flex items-center justify-between p-4 pb-2">
          <div class="flex items-center gap-2">
            <span
              class="cursor-pointer select-none text-lg font-semibold"
              @click="loadPinnedThoughts"
              >闪念</span
            >
          </div>
        </div>

        <div v-if="thoughtsLoading" class="py-10 text-center">
          <div
            class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary"
          ></div>
        </div>

        <div v-else class="flex-1 space-y-1 overflow-y-auto p-4 pt-2">
          <div
            v-for="(thought, index) in pinnedThoughts"
            :key="thought.id"
            class="group relative flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition-all hover:bg-accent hover:text-accent-foreground"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="
              navTo({
                title: '闪念',
                url: '/my-hub/think',
                icon: 'mdi:lightbulb-on-outline',
              })
            "
          >
            <div class="mt-1 flex-shrink-0">
              <svg
                class="size-4 text-yellow-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12M8.8,14L10,12.8V4H14V12.8L15.2,14H8.8Z"
                />
              </svg>
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex items-start justify-between gap-2">
                <span
                  class="line-clamp-3 flex-1 whitespace-pre-wrap text-sm font-medium leading-snug text-foreground"
                >
                  {{ thought.content }}
                </span>
                <span
                  class="mt-0.5 flex-shrink-0 whitespace-nowrap text-[10px] text-muted-foreground"
                >
                  {{ formatThoughtTime(thought.createTime) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <TimeTrackerModal
      ref="timeTrackerModalRef"
      @success="handleTimeTrackerSuccess"
    />
    <ExerciseAddModal ref="exerciseModalRef" @success="handleExerciseSuccess" />
    <WatchedTaskEditModal
      v-model:visible="editTaskModalVisible"
      :task="editingWatchedTask"
      @success="loadWatchedTasks"
    />
  </div>
</template>
