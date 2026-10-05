<script lang="ts" setup>
import type { Component } from 'vue';

import type { WatchedTaskDetail } from '#/api/core/dashboard';

import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import {
  getDashboardCardDetail,
  getDashboardTasks,
  getWatchedTaskDetails,
} from '#/api/core/dashboard';
import { getPinnedThoughts } from '#/api/core/think';
import { updateTaskDetail } from '#/api/core/todo';
import { getUserBindListApi } from '#/api/core/user-bind';
import BusinessIcon from '#/components/BusinessIcon.vue';
import {
  ACTION_OPEN_EXERCISE_MODAL,
  ACTION_OPEN_TIME_TRACKER_MODAL,
} from '#/constants/action';
import { useHomeCardsStore } from '#/store/home-cards';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useQuickNavStore } from '#/store/quick-nav';

import ExerciseAddModal from '../../my-hub/exercise/components/ExerciseAddModal.vue';
import ThinkModal from '../../my-hub/think/ThinkModal.vue';
import TimeTrackerModal from '../../time/time-tracker/components/TimeTrackerModal.vue';
import AnalyticsTimeTracker from './analytics-time-tracker.vue';
import AnalysisCard from './components/analysis-card.vue';
import BusinessCards from './components/BusinessCards.vue';
import BusinessCardSkeleton from './components/BusinessCardSkeleton.vue';
import CardHeader from './components/CardHeader.vue';
import ExerciseSummaryCard from './components/ExerciseSummaryCard.vue';
import GithubRecentCommits from './components/GithubRecentCommits.vue';
import HomeCardSortGrid from './components/HomeCardSortGrid.vue';
import QuickNavSection from './components/QuickNavSection.vue';
import WatchedTaskEditModal from './components/WatchedTaskEditModal.vue';
import WereadRecentCard from './components/WereadRecentCard.vue';
import { useHomeRequest } from './composables/useHomeRequest';

interface OverviewItem {
  cardKey: string;
  icon: Component | string;
  iconColor?: string;
  iconClickUrl?: string;
  title: string;
  titleClickUrl?: string;
  totalTitle?: string;
  totalValue?: number | string;
  value?: number | string;
  valueColor?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: boolean;
  type?: string;
  refreshInterval?: number;
}

const homeCards = useHomeCardsStore();
const menuVisuals = useMenuVisualsStore();
onMounted(() => menuVisuals.load());
const sectionVisibility = ref<Record<string, boolean>>({});
function sectionVisible(section: { cardKey: string }) {
  if (section.cardKey === 'section.watched')
    return (
      !watchedLoaded.value ||
      watchedError.value ||
      watchedTasks.value.length > 0
    );
  if (section.cardKey === 'section.github') return githubBound.value;
  if (section.cardKey === 'section.exercise')
    return exerciseLoading.value || !exerciseEmpty.value;
  return sectionVisibility.value[section.cardKey] !== false;
}
const overviewCards = computed<OverviewItem[]>(() => {
  if (loading.value && overviewItems.value.length === 0)
    return homeCards.items
      .filter((item) => item.group === 'overview' && item.enabled)
      .map((item) => ({
        cardKey: item.cardKey,
        title: item.title,
        icon: item.icon,
        loading: true,
      }));
  return overviewItems.value
    .filter(
      (item) =>
        item.loading ||
        item.error ||
        (item.value !== undefined && item.value !== null && item.value !== ''),
    )
    .sort((a, b) => homeCards.order(a.cardKey) - homeCards.order(b.cardKey));
});
let active = true;
let dataGeneration = 0;
const cardVersions = new Map<string, number>();
const homeUser = useUserStore();
const overviewItems = ref<OverviewItem[]>([]);

const watchedTasks = ref<WatchedTaskDetail[]>([]);
const watchedRequest = useHomeRequest({
  fetch: getWatchedTaskDetails,
  enabled: () => homeCards.enabled('section.watched'),
  apply: (data) => {
    watchedTasks.value = data;
  },
  initialLoading: true,
});
const {
  loading: watchedLoading,
  loaded: watchedLoaded,
  failed: watchedError,
} = watchedRequest;
const pinnedThoughts = ref<any[]>([]);
const thoughtsRequest = useHomeRequest({
  fetch: getPinnedThoughts,
  enabled: () => homeCards.enabled('section.thoughts'),
  apply: (data) => {
    pinnedThoughts.value = data || [];
  },
  initialLoading: true,
});
const {
  loading: thoughtsLoading,
  loaded: thoughtsLoaded,
  failed: thoughtsError,
} = thoughtsRequest;
const thinkModalVisible = ref(false);
const editingThoughtId = ref<null | string>(null);
const timeTrackerModalRef = ref();
// 上次时迹记录末分钟结束后的边界（分钟数，0 表示今日无记录）
const timeTrackerLastEnd = ref(0);
// 当前时间（分钟数），每分钟更新，用于计算"距离上次记录已过去多久"
const nowMinutes = ref(new Date().getHours() * 60 + new Date().getMinutes());
const timeTrackerNowTimer = ref<ReturnType<typeof setInterval>>();
// 距离上次记录已过去的时长（格式化）
const timeTrackerElapsedText = computed(() => {
  if (timeTrackerLastEnd.value <= 0) return '';
  const elapsed = nowMinutes.value - timeTrackerLastEnd.value;
  if (elapsed <= 0) return '0m';
  const h = Math.floor(elapsed / 60);
  const m = elapsed % 60;
  if (h > 0 && m > 0) return `${h}h${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
});
const exerciseModalRef = ref();
const exerciseSummaryCardRef = ref();
const exerciseLoading = ref(true);
const exerciseEmpty = ref(false);

function handleExerciseLoaded(isEmpty: boolean) {
  exerciseLoading.value = false;
  exerciseEmpty.value = isEmpty;
}

const timeTrackerCardRef = ref();
const githubRecentCommitsRef = ref();
const githubBound = ref(false);
const githubUsername = ref('');

async function refreshTimeTracker() {
  if (!homeCards.enabled('section.time')) return;
  await timeTrackerCardRef.value?.loadData();
}

// 本地缓存的 GitHub 绑定决策 + 用户名：秒填，让最近提交区块与其它区块同时出现
const GITHUB_BIND_CACHE_KEY = `aio-life:github-bind:${homeUser.userInfo?.userId || homeUser.userInfo?.id || ''}`;

interface GithubBindCache {
  bound: boolean;
  username?: string;
}

function readGithubBindCache(): GithubBindCache | null {
  try {
    const raw = localStorage.getItem(GITHUB_BIND_CACHE_KEY);
    return raw ? (JSON.parse(raw) as GithubBindCache) : null;
  } catch {
    return null;
  }
}

function writeGithubBindCache(data: GithubBindCache) {
  try {
    localStorage.setItem(GITHUB_BIND_CACHE_KEY, JSON.stringify(data));
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

function clearGithubBindCache() {
  localStorage.removeItem(GITHUB_BIND_CACHE_KEY);
}

function restoreGithubCache() {
  const cached = readGithubBindCache();
  if (cached) {
    githubBound.value = cached.bound;
    githubUsername.value = cached.username || '';
  }
}

// 并行校验 GitHub 绑定状态：刷新用户名并回写缓存，不阻塞首页渲染
async function verifyGithub() {
  try {
    const binds = await getUserBindListApi(true);
    if (!active) return;
    const githubBind = binds.find(
      (item) => item.platform === 'github' && item.platformUsername,
    );
    const username = githubBind?.platformUsername || '';
    githubUsername.value = username;
    if (username) {
      writeGithubBindCache({
        bound: githubBound.value,
        username,
      });
    } else {
      clearGithubBindCache();
    }
  } catch (error) {
    console.error('查询 GitHub 绑定失败:', error);
  }
}
const editTaskModalVisible = ref(false);
const editingWatchedTask = ref<null | WatchedTaskDetail>(null);

function openEditTaskModal(task: WatchedTaskDetail) {
  editingWatchedTask.value = task;
  editTaskModalVisible.value = true;
}

// 定时器管理
const refreshTimers = new Map<string, ReturnType<typeof setInterval>>();

// 各区块自动刷新间隔（秒）
const SECTION_REFRESH = {
  timeTracker: 300, // 时迹：5分钟
  thoughts: 3600, // 闪念：60分钟
  exercise: 600, // 运动：10分钟
  github: 3600, // GitHub：60分钟
  watchedTasks: 1800, // 待办：30分钟
};

const sectionTimers = new Map<string, ReturnType<typeof setInterval>>();

function loadWatchedTasks() {
  if (!homeCards.enabled('section.watched')) return Promise.resolve();
  return watchedRequest.load();
}

function loadPinnedThoughts() {
  if (!homeCards.enabled('section.thoughts')) return Promise.resolve();
  return thoughtsRequest.load();
}

function reloadWatchedAfterWrite() {
  return watchedRequest.load(true);
}

function openNewThought() {
  editingThoughtId.value = null;
  thinkModalVisible.value = true;
}

function openThinkModal(thought: any) {
  editingThoughtId.value = thought.id;
  thinkModalVisible.value = true;
}

function onThoughtSaved() {
  void thoughtsRequest.load(true);
}

function onThoughtDeleted() {
  void thoughtsRequest.load(true);
}

const taskBusy = ref('');
async function handleCompleteTask(detail: WatchedTaskDetail) {
  if (taskBusy.value) return;
  taskBusy.value = detail.id;
  try {
    await updateTaskDetail({
      id: detail.id,
      isCompleted: 1,
    });
    await reloadWatchedAfterWrite();
  } catch (error) {
    console.error('标记完成失败:', error);
  } finally {
    taskBusy.value = '';
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
  if (!active) return;
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

function clearSectionTimer(key: string) {
  if (sectionTimers.has(key)) {
    clearInterval(sectionTimers.get(key));
    sectionTimers.delete(key);
  }
}

function setupSectionTimer(
  key: string,
  intervalSeconds: number,
  refreshFn: () => void,
) {
  clearSectionTimer(key);
  const preferenceKey =
    (
      { timeTracker: 'time', watchedTasks: 'watched' } as Record<string, string>
    )[key] || key;
  if (!homeCards.enabled(`section.${preferenceKey}`)) return;
  if (document.visibilityState === 'hidden') return;
  sectionTimers.set(key, setInterval(refreshFn, intervalSeconds * 1000));
}

function startAllSectionTimers() {
  if (!active) return;
  setupSectionTimer(
    'timeTracker',
    SECTION_REFRESH.timeTracker,
    refreshTimeTracker,
  );
  setupSectionTimer('thoughts', SECTION_REFRESH.thoughts, loadPinnedThoughts);
  setupSectionTimer('exercise', SECTION_REFRESH.exercise, () =>
    exerciseSummaryCardRef.value?.reload?.(),
  );
  if (githubBound.value) {
    setupSectionTimer('github', SECTION_REFRESH.github, () =>
      githubRecentCommitsRef.value?.load?.(),
    );
  }
  setupSectionTimer(
    'watchedTasks',
    SECTION_REFRESH.watchedTasks,
    loadWatchedTasks,
  );
}

function clearAllSectionTimers() {
  sectionTimers.forEach((timer) => clearInterval(timer));
  sectionTimers.clear();
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    if (overviewError.value) void overviewRequest.load();
    // 首次失败时尚未拿到刷新间隔，回到前台也需要允许重试。
    overviewItems.value.forEach((item) => {
      if (item.error || (item.refreshInterval && item.refreshInterval > 0)) {
        refreshCard(item);
      }
    });
    // 刷新各区块并重建定时器
    refreshTimeTracker();
    loadPinnedThoughts();
    exerciseSummaryCardRef.value?.reload?.();
    if (githubBound.value) {
      githubRecentCommitsRef.value?.load?.();
    }
    loadWatchedTasks();
    startAllSectionTimers();
  } else {
    // 切换到后台时，清除所有定时器
    refreshTimers.forEach((timer) => clearInterval(timer));
    refreshTimers.clear();
    clearAllSectionTimers();
  }
}

function stopTimers() {
  active = false;
  dataGeneration++;
  overviewItems.value.forEach((item) => {
    item.loading = false;
    item.refreshing = false;
  });
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (timeTrackerNowTimer.value) clearInterval(timeTrackerNowTimer.value);
  // 清理所有定时器
  refreshTimers.forEach((timer) => clearInterval(timer));
  refreshTimers.clear();
  clearAllSectionTimers();
}
onUnmounted(stopTimers);
onDeactivated(stopTimers);
onActivated(() => {
  if (active) return;
  active = true;
  document.addEventListener('visibilitychange', handleVisibilityChange);
  startNowTimer();
  handleVisibilityChange();
});

// 每分钟更新 nowMinutes，驱动"距离上次记录已过去多久"的实时计算
let timeDay = new Date().toDateString();
function startNowTimer() {
  const now = new Date();
  nowMinutes.value = now.getHours() * 60 + now.getMinutes();
  timeTrackerNowTimer.value = setInterval(() => {
    const now = new Date();
    nowMinutes.value = now.getHours() * 60 + now.getMinutes();
    if (now.toDateString() !== timeDay) {
      timeDay = now.toDateString();
      void timeTrackerCardRef.value?.loadData(true);
    }
  }, 60_000);
}
onMounted(startNowTimer);

const overviewRequest = useHomeRequest({
  initialLoading: true,
  fetch: getDashboardTasks,
  apply: (tasks) => {
    // GITHUB 卡出现 ⟺ 后端 Redis 决策判定展示（未绑定则无此卡）；以任务列表为准修正本地缓存
    githubBound.value = tasks.some((t) => t.type === 'GITHUB');
    writeGithubBindCache({
      bound: githubBound.value,
      username: githubUsername.value,
    });
    const items: OverviewItem[] = [];
    // 2. 构建初始列表（占位符）
    tasks
      .filter((task) =>
        homeCards.enabled(`overview.${task.type.toLowerCase()}`),
      )
      .sort(
        (a, b) =>
          homeCards.order(`overview.${a.type.toLowerCase()}`) -
          homeCards.order(`overview.${b.type.toLowerCase()}`),
      )
      .forEach((task) => {
        const previous = overviewItems.value.find(
          (item) => item.type === task.type,
        );
        items.push({
          ...previous,
          cardKey: `overview.${task.type.toLowerCase()}`,
          title: task.title,
          type: task.type,
          loading: !previous,
          refreshing: !!previous,
          icon: task.icon,
          iconColor: task.iconColor,
          totalTitle: task.totalTitle,
          totalValue: previous?.totalValue ?? '',
          value: previous?.value ?? '',
        });
      });

    overviewItems.value = items;

    // 3. 首次加载与后续刷新共用状态收尾，单张卡片失败不影响其他卡片。
    overviewItems.value.forEach((item) => {
      loadCard(item);
    });
  },
});
const { loading, failed: overviewError } = overviewRequest;

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (homeCards.enabled('section.links')) void quickNavStore.load();
  if (homeCards.enabled('section.github')) {
    restoreGithubCache();
    void verifyGithub();
  }
  void loadWatchedTasks();
  void loadPinnedThoughts();
  void overviewRequest.load().then(startAllSectionTimers);
});

async function refreshCard(item: OverviewItem, force = false) {
  if (!active || (!force && (item.loading || item.refreshing)) || !item.type) {
    return;
  }

  // 静默刷新：保留旧数据 + 顶部进度条，不替换为 skeleton 以避免高度抖动
  item.refreshing = true;
  await loadCard(item);
}

async function loadCard(item: OverviewItem) {
  const generation = dataGeneration;
  const type = item.type!;
  const version = (cardVersions.get(type) || 0) + 1;
  cardVersions.set(type, version);
  const current = () =>
    active &&
    generation === dataGeneration &&
    cardVersions.get(type) === version &&
    overviewItems.value.includes(item);
  try {
    const res = await getDashboardCardDetail(item.type!);
    if (!current()) return;
    if (!res) {
      throw new Error('卡片数据为空');
    }
    Object.assign(item, res);
    item.error = false;
  } catch (error) {
    if (!current()) return;
    console.error(`Failed to fetch card ${item.title}`, error);
    item.error = true;
  } finally {
    if (current()) {
      item.loading = false;
      item.refreshing = false;
      setupCardRefresh(item);
    }
  }
}

function handleCardClick(item: OverviewItem) {
  refreshCard(item);
}

function handleTitleClick(url: string) {
  if (url === ACTION_OPEN_TIME_TRACKER_MODAL) {
    timeTrackerModalRef.value?.open();
  } else if (url === ACTION_OPEN_EXERCISE_MODAL) {
    // 点击「今日运动」标题进入运动页面，而非弹出录入弹窗
    navTo({ url: '/record/exercise' });
  }
}

// 时迹记录可携带运动明细，需要同步刷新运动卡片；阅读卡片由微信读书独立刷新
const TIME_TRACKER_RELATED_CARDS = ['EXERCISE'];

function refreshCardsByTypes(types: string[]) {
  const typeSet = new Set(types);
  overviewItems.value.forEach((item) => {
    if (item.type && typeSet.has(item.type)) {
      refreshCard(item, true);
    }
  });
}

function handleTimeTrackerSuccess() {
  // 1. 时迹区块
  void timeTrackerCardRef.value?.loadData(true);
  // 2. 时迹波及的卡片（写入后刷新使旧请求失效）
  refreshCardsByTypes(TIME_TRACKER_RELATED_CARDS);
  // 3. 运动区块（时迹分类可能带运动明细）
  exerciseSummaryCardRef.value?.reload?.(true);
}

function handleExerciseSuccess() {
  overviewItems.value.forEach((item) => {
    if (
      item.titleClickUrl === ACTION_OPEN_EXERCISE_MODAL ||
      item.iconClickUrl === ACTION_OPEN_EXERCISE_MODAL
    ) {
      refreshCard(item, true);
    }
  });
  exerciseSummaryCardRef.value?.reload?.(true);
}

const router = useRouter();
const quickNavStore = useQuickNavStore();

function navTo(nav: { url?: string }) {
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
  <div class="dashboard-home p-2 sm:p-4">
    <button
      v-if="overviewError"
      type="button"
      aria-label="概览加载失败，重试"
      :disabled="loading"
      class="mb-2 rounded p-2 text-xs text-primary"
      @click="overviewRequest.load()"
    >
      加载失败，重试
    </button>
    <HomeCardSortGrid
      :items="overviewCards"
      group="overview"
      class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5"
    >
      <template #default="{ item }">
        <AnalysisCard
          :loading="item.loading"
          :refreshing="item.refreshing"
          :error="item.error"
          :icon="
            menuVisuals.visual(`overview.${item.type?.toLowerCase()}`).icon
          "
          :icon-color="
            menuVisuals.visual(`overview.${item.type?.toLowerCase()}`).iconColor
          "
          :icon-click-url="item.iconClickUrl"
          :title="item.title"
          :title-click-url="item.titleClickUrl"
          :total-title="item.totalTitle"
          :total-value="item.totalValue"
          :value="item.value"
          :value-color="item.valueColor"
          class="min-w-0 cursor-pointer"
          @click="handleCardClick(item)"
          @retry="refreshCard(item)"
          @title-click="handleTitleClick"
        />
      </template>
    </HomeCardSortGrid>
    <HomeCardSortGrid
      :items="homeCards.sections"
      group="section"
      :visible="sectionVisible"
      class="mt-2 grid items-stretch gap-2 sm:mt-3 sm:gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      <template #default="{ item: section }">
        <!-- 时迹统计 -->
        <div
          v-if="section.cardKey === 'section.time'"
          class="dashboard-section flex h-[240px] min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground transition-all sm:h-[250px] lg:h-[280px]"
        >
          <CardHeader
            class="p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
            label="刷新时迹"
            :error="timeTrackerCardRef?.failed && timeTrackerCardRef?.loaded"
            :loading="timeTrackerCardRef?.loading"
            :refresh="refreshTimeTracker"
          >
            <span
              class="select-none text-base font-semibold transition-colors hover:text-primary"
              title="进入时迹"
              @click.stop="navTo({ url: '/time/time-tracker' })"
              ><BusinessIcon
                card-key="section.time"
                class="mr-2 inline-block size-4 align-middle"
              />时迹</span
            >
            <span
              class="flex cursor-pointer items-center gap-1 rounded-full bg-secondary/60 px-2 py-1 transition-colors hover:bg-secondary"
              title="记录时迹"
              @click.stop="timeTrackerModalRef?.open()"
            >
              <span
                v-if="timeTrackerElapsedText"
                class="font-mono text-xs tabular-nums leading-none text-foreground"
              >
                {{ timeTrackerElapsedText }}
              </span>
              <span class="text-sm leading-none text-muted-foreground">+</span>
            </span>
          </CardHeader>
          <div class="flex-1 overflow-hidden p-1.5 pt-0 sm:p-2 sm:pt-0">
            <AnalyticsTimeTracker
              :ref="
                (el) => {
                  timeTrackerCardRef = el;
                }
              "
              @success="handleTimeTrackerSuccess"
              @update:last-end="(v) => (timeTrackerLastEnd = v)"
            />
          </div>
        </div>

        <!-- 快捷导航 -->
        <QuickNavSection
          v-if="section.cardKey === 'section.links'"
          class="dashboard-section"
        />

        <!-- 待办：单列布局按内容自适应，双列及以上保持统一卡片高度。 -->
        <div
          v-if="
            section.cardKey === 'section.watched' &&
            (!watchedLoaded || watchedError || watchedTasks.length > 0)
          "
          class="dashboard-section relative flex h-auto min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground transition-all md:h-[250px] lg:h-[280px]"
        >
          <CardHeader
            class="p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
            label="刷新待办"
            :error="watchedError"
            :refresh="loadWatchedTasks"
            :loading="watchedLoading"
          >
            <div class="flex items-center gap-2">
              <span
                class="cursor-pointer select-none text-base font-semibold transition-colors hover:text-primary"
                title="进入待办"
                @click="navTo({ url: '/task/todo' })"
                ><BusinessIcon
                  card-key="section.watched"
                  class="mr-2 inline-block size-4 align-middle"
                />待办</span
              >
            </div>
          </CardHeader>

          <div
            v-if="watchedLoading && !watchedLoaded"
            class="flex-1 space-y-1 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
          >
            <BusinessCardSkeleton :count="1" :row-height="64" />
          </div>

          <div
            v-else-if="watchedLoaded && watchedTasks.length === 0"
            class="m-2.5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-center sm:m-3"
          >
            <svg
              class="mx-auto mb-2 size-8 text-muted-foreground"
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

          <div
            v-else
            :class="{ 'min-h-16': watchedError && watchedTasks.length === 0 }"
            class="flex-1 space-y-1 overflow-y-auto p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
          >
            <div
              v-for="(task, index) in watchedTasks"
              :key="task.id"
              class="group relative flex items-center gap-2 rounded-xl p-2 transition-all hover:bg-accent hover:text-accent-foreground"
              :style="{ animationDelay: `${index * 50}ms` }"
            >
              <button
                class="flex-shrink-0 rounded border-2 border-border p-0.5 transition-all hover:border-green-500 hover:bg-green-500/10 focus:outline-none focus:ring-0 focus:ring-offset-0 active:outline-none"
                :class="{
                  'border-green-500 bg-green-500 hover:border-green-600 hover:bg-green-600':
                    task.isCompleted === 1,
                }"
                :aria-label="task.isCompleted === 1 ? '待办已完成' : '完成待办'"
                :aria-busy="taskBusy === task.id"
                :disabled="!!taskBusy"
                @click="handleCompleteTask(task)"
              >
                <VbenIcon
                  v-if="taskBusy === task.id"
                  icon="mdi:loading"
                  class="size-3 animate-spin"
                />
                <svg
                  v-else-if="task.isCompleted === 1"
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
                  class="cursor-pointer text-xs font-medium leading-snug text-foreground transition-colors hover:text-primary"
                  :class="{
                    'text-muted-foreground line-through':
                      task.isCompleted === 1,
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

        <!-- 固定闪念：单列布局按内容自适应，双列及以上保持统一卡片高度。 -->
        <div
          v-if="section.cardKey === 'section.thoughts'"
          class="dashboard-section relative flex h-auto min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground transition-all md:h-[250px] lg:h-[280px]"
        >
          <CardHeader
            class="p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
            label="刷新闪念"
            :error="thoughtsError"
            :refresh="loadPinnedThoughts"
            :loading="thoughtsLoading"
          >
            <span
              class="select-none text-base font-semibold transition-colors hover:text-primary"
              title="进入闪念"
              @click.stop="navTo({ url: '/record/think' })"
              ><BusinessIcon
                card-key="section.thoughts"
                class="mr-2 inline-block size-4 align-middle"
              />闪念</span
            >
            <span
              class="flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              title="记录闪念"
              @click.stop="openNewThought"
              >+</span
            >
          </CardHeader>

          <div
            v-if="thoughtsLoading && !thoughtsLoaded"
            class="flex-1 space-y-1 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
          >
            <BusinessCardSkeleton :count="1" :row-height="64" />
          </div>

          <div
            v-else-if="thoughtsLoaded && pinnedThoughts.length === 0"
            class="m-2.5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-center sm:m-3"
          >
            <svg
              class="mx-auto mb-2 size-8 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <p class="text-sm text-muted-foreground">暂无固定的闪念</p>
            <p class="mt-1 text-xs text-muted-foreground">
              在闪念中点击星标固定到首页
            </p>
          </div>

          <div
            v-else
            :class="{
              'min-h-16': thoughtsError && pinnedThoughts.length === 0,
            }"
            class="flex-1 space-y-1 overflow-y-auto p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
          >
            <div
              v-for="(thought, index) in pinnedThoughts"
              :key="thought.id"
              class="group relative flex cursor-pointer items-start gap-2 rounded-xl p-2 transition-all hover:bg-accent hover:text-accent-foreground"
              :style="{ animationDelay: `${index * 50}ms` }"
              @click="openThinkModal(thought)"
            >
              <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                <div class="flex items-start justify-between gap-2">
                  <span
                    class="line-clamp-3 flex-1 whitespace-pre-wrap text-xs font-medium leading-snug text-foreground"
                    :class="{ 'select-none blur-sm': thought.hiddenContent }"
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

        <BusinessCards
          v-if="
            [
              'section.goal',
              'section.anniversary',
              'section.reading',
              'section.membership',
              'section.movie',
            ].includes(section.cardKey)
          "
          :only="section.cardKey.slice(8)"
          @visibility="sectionVisibility[section.cardKey] = $event"
        />

        <WereadRecentCard v-if="section.cardKey === 'section.weread'" @visibility="sectionVisibility[section.cardKey] = $event" />

        <!-- 运动：单列布局按内容自适应，双列及以上保持统一卡片高度。 -->
        <div
          v-if="section.cardKey === 'section.exercise'"
          v-show="exerciseLoading || !exerciseEmpty"
          class="dashboard-section relative flex h-auto min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground transition-all md:h-[250px] lg:h-[280px]"
        >
          <CardHeader
            class="p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
            label="刷新运动"
            :loading="exerciseSummaryCardRef?.loading"
            :refresh="() => exerciseSummaryCardRef?.reload?.()"
          >
            <div class="flex items-center gap-2">
              <span class="inline-flex text-foreground">
                <BusinessIcon card-key="section.exercise" class="size-4" />
              </span>
              <span
                class="cursor-pointer select-none text-base font-semibold transition-colors hover:text-primary"
                title="进入运动记录"
                @click="navTo({ url: '/record/exercise' })"
              >
                运动
              </span>
            </div>

            <button
              type="button"
              aria-label="新增运动"
              class="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary"
              @click="exerciseModalRef?.open()"
            >
              <VbenIcon icon="mdi:plus" class="size-5" />
            </button>
          </CardHeader>
          <ExerciseSummaryCard
            :ref="
              (el) => {
                exerciseSummaryCardRef = el;
              }
            "
            @loaded="handleExerciseLoaded"
          />
        </div>

        <!-- GitHub 最近提交：未绑定时不渲染。注意：移动端下不要写死固定高度，使用 min-h-0 让其根据内容自适应高度，避免内容较少时出现大量留白。PC 端可使用 sm:min-h-[xxx] 等固定高度。 -->
        <div
          v-if="section.cardKey === 'section.github' && githubBound"
          class="dashboard-section flex h-[240px] min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground transition-all sm:h-[250px] lg:h-[280px]"
        >
          <CardHeader
            class="p-2.5 pb-1.5 sm:p-3 sm:pb-1.5"
            label="刷新最近提交"
            :error="
              githubRecentCommitsRef?.failed && githubRecentCommitsRef?.loaded
            "
            :loading="githubRecentCommitsRef?.loading"
            :refresh="() => githubRecentCommitsRef?.load?.()"
          >
            <div class="flex items-center gap-2">
              <a
                v-if="githubUsername"
                :href="`https://github.com/${githubUsername}`"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex cursor-pointer text-foreground transition-colors hover:text-primary"
                :title="`访问 ${githubUsername} 的 GitHub 主页`"
              >
                <BusinessIcon card-key="section.github" class="size-4" />
              </a>
              <span v-else class="inline-flex text-foreground">
                <BusinessIcon card-key="section.github" class="size-4" />
              </span>
              <a
                v-if="githubUsername"
                :href="`https://github.com/${githubUsername}`"
                target="_blank"
                rel="noopener noreferrer"
                class="cursor-pointer select-none text-base font-semibold transition-colors hover:text-primary"
                :title="`访问 ${githubUsername} 的 GitHub 主页`"
              >
                最近提交
              </a>
              <span v-else class="select-none text-base font-semibold"
                >最近提交</span
              >
            </div>
          </CardHeader>
          <GithubRecentCommits
            :ref="
              (el) => {
                githubRecentCommitsRef = el;
              }
            "
          />
        </div>
      </template>
    </HomeCardSortGrid>
    <TimeTrackerModal
      ref="timeTrackerModalRef"
      @success="handleTimeTrackerSuccess"
    />
    <ExerciseAddModal ref="exerciseModalRef" @success="handleExerciseSuccess" />
    <ThinkModal
      v-model:visible="thinkModalVisible"
      :thought-id="editingThoughtId"
      @saved="onThoughtSaved"
      @deleted="onThoughtDeleted"
    />
    <WatchedTaskEditModal
      v-model:visible="editTaskModalVisible"
      :task="editingWatchedTask"
      @success="reloadWatchedAfterWrite"
    />
  </div>
</template>

<style scoped>
/* 首页保留页面和卡片滚动，仅隐藏原生滚动条。 */
.dashboard-home :deep(.overflow-y-auto),
:global(html:has(.dashboard-home)),
:global(body:has(.dashboard-home)) {
  scrollbar-width: none;
}

.dashboard-home :deep(.overflow-y-auto::-webkit-scrollbar),
:global(html:has(.dashboard-home)::-webkit-scrollbar),
:global(body:has(.dashboard-home)::-webkit-scrollbar) {
  display: none;
}

.dashboard-section {
  max-height: 240px;
}

@media (min-width: 640px) {
  .dashboard-section {
    max-height: 250px;
  }
}

@media (min-width: 1024px) {
  .dashboard-section {
    max-height: 280px;
  }
}
</style>
