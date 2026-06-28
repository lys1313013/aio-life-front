<script lang="ts" setup>
import type {
  ExerciseDashboardDayVO,
  ExerciseDashboardItemVO,
} from '#/api/core/exerciseRecord';

import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Skeleton } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getDashboardSummaryApi } from '#/api/core/exerciseRecord';

const emit = defineEmits<{
  loaded: [isEmpty: boolean];
}>();

const PAGE_SIZE = 7;

const days = ref<ExerciseDashboardDayVO[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const loaded = ref(false);
const finished = ref(false);
const cursor = ref<string | undefined>(undefined);
const scrollRoot = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function logError(scope: string, error: any) {
  const status = error?.response?.status;
  const url = error?.config?.url;
  const data = error?.response?.data;
  const message =
    data?.result ||
    error?.message ||
    (typeof error === 'string' ? error : 'unknown error');
  console.error(
    `[运动] ${scope} 失败: status=${status ?? '-'} url=${url ?? '-'} message=${message}`,
    { data, error },
  );
}

async function loadPage() {
  if (finished.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const res = await getDashboardSummaryApi({
      lastDate: cursor.value,
      limit: PAGE_SIZE,
    });
    const incoming = res?.days || [];
    if (incoming.length > 0) {
      days.value = [...days.value, ...incoming];
    }
    if (res?.lastDate) {
      cursor.value = res.lastDate;
    }
    if (!res?.hasMore || incoming.length === 0) {
      finished.value = true;
    }
  } catch (error) {
    logError('loadPage', error);
  } finally {
    loadingMore.value = false;
  }
}

async function init() {
  loading.value = true;
  days.value = [];
  cursor.value = undefined;
  finished.value = false;
  try {
    const res = await getDashboardSummaryApi({
      lastDate: undefined,
      limit: PAGE_SIZE,
    });
    const incoming = res?.days || [];
    days.value = incoming;
    if (res?.lastDate) cursor.value = res.lastDate;
    if (!res?.hasMore || incoming.length === 0) finished.value = true;
  } catch (error) {
    logError('init', error);
    days.value = [];
  } finally {
    loading.value = false;
    loaded.value = true;
    emit('loaded', days.value.length === 0);
    // 内容不足一屏时主动再拉一次，确保向下滚动体验连贯
    requestAnimationFrame(() => maybeLoadMore());
  }
}

function setupObserver() {
  if (!sentinel.value) return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          maybeLoadMore();
        }
      }
    },
    { root: scrollRoot.value, rootMargin: '120px 0px', threshold: 0 },
  );
  observer.observe(sentinel.value);
}

function maybeLoadMore() {
  if (loading.value || loadingMore.value || finished.value) return;
  if (!scrollRoot.value || !sentinel.value) return;
  const root = scrollRoot.value;
  const distance =
    sentinel.value.getBoundingClientRect().bottom -
    root.getBoundingClientRect().bottom;
  if (distance <= 160) {
    loadPage();
  }
}

function formatDate(date?: string) {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return date;
  const today = dayjs();
  const yesterday = today.subtract(1, 'day');
  if (d.isSame(today, 'day')) return '今天';
  if (d.isSame(yesterday, 'day')) return '昨天';
  if (d.year() === today.year()) return d.format('MM-DD');
  return d.format('YYYY-MM-DD');
}

function weekday(date?: string) {
  if (!date) return '';
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[dayjs(date).day()] || '';
}

function fallbackColor(seed?: string): string {
  const palette: string[] = [
    '#3FB27F',
    '#3B82F6',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#EC4899',
    '#10B981',
  ];
  if (!seed) return palette[0]!;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length]!;
}

function itemColor(item: { color?: string; exerciseTypeId?: string }): string {
  return item.color ?? fallbackColor(item.exerciseTypeId);
}

function itemIcon(item: { exerciseTypeId?: string; icon?: string }): string {
  return item.icon ?? 'mdi:run';
}

interface DeltaInfo {
  text: string;
  tone: 'down' | 'neutral' | 'new' | 'up';
}

function deltaInfo(item: ExerciseDashboardItemVO): DeltaInfo | undefined {
  // 首次记录（无 prevCount） → 「新增」
  if (item.prevCount === undefined || item.prevCount === null) {
    return { text: '新增', tone: 'new' };
  }
  const delta = item.deltaCount ?? 0;
  const percent = item.deltaPercent;
  const sign = delta > 0 ? '+' : '';
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '=';
  const pct =
    percent === undefined || percent === null ? '' : `${sign}${percent}%`;
  const abs = `${sign}${delta}`;
  const text = delta === 0 ? `${arrow} ${abs}` : `${arrow} ${abs} ${pct}`;
  let tone: DeltaInfo['tone'] = 'neutral';
  if (delta > 0) tone = 'up';
  else if (delta < 0) tone = 'down';
  return { text, tone };
}

function deltaTone(item: ExerciseDashboardItemVO): DeltaInfo['tone'] {
  return deltaInfo(item)?.tone || 'neutral';
}

function deltaColor(item: ExerciseDashboardItemVO, base: string): string {
  const tone = deltaTone(item);
  if (tone === 'up') return '#10B981';
  // down 情况下不再让整个 chip 变红，只返回基础色
  return base;
}

function deltaBg(item: ExerciseDashboardItemVO, base: string): string {
  const tone = deltaTone(item);
  if (tone === 'up') return 'rgba(16, 185, 129, 0.12)';
  // down 情况下不再使用红色背景
  return `${base}1A`;
}

async function reload() {
  observer?.disconnect();
  await init();
  await nextTick();
  setupObserver();
}

onMounted(async () => {
  await init();
  await Promise.resolve();
  setupObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

defineExpose({ reload });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      v-if="loading"
      class="flex-1 space-y-2 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <Skeleton
        v-for="i in 4"
        :key="i"
        :paragraph="{ rows: 1 }"
        active
        class="!w-full"
      />
    </div>

    <div
      v-else-if="loaded && days.length === 0"
      class="m-2.5 flex-1 rounded-xl border border-dashed border-border py-4 text-center sm:m-3"
    >
      <VbenIcon
        icon="mdi:run"
        class="mx-auto mb-1.5 size-7 text-muted-foreground"
      />
      <p class="text-sm text-muted-foreground">暂无运动记录</p>
      <p class="mt-1 text-xs text-muted-foreground">
        点击右上角「运动」卡片即可记录
      </p>
    </div>

    <div
      v-else
      ref="scrollRoot"
      class="flex-1 space-y-1.5 overflow-y-auto p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <div
        v-for="(day, dayIndex) in days"
        :key="day.date || dayIndex"
        class="rounded-xl p-1.5 transition-all hover:bg-accent/40"
      >
        <div class="mb-1 flex items-baseline gap-1.5 px-1">
          <span class="text-xs font-semibold text-foreground">
            {{ formatDate(day.date) }}
          </span>
          <span class="text-[10px] text-muted-foreground">
            {{ weekday(day.date) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5 px-1">
          <div
            v-for="item in day.items || []"
            :key="`${day.date}-${item.exerciseTypeId}`"
            class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
            :style="{
              backgroundColor: deltaBg(item, itemColor(item)),
              color: deltaColor(item, itemColor(item)),
            }"
          >
            <VbenIcon :icon="itemIcon(item)" class="size-3" />
            <span class="truncate">{{ item.typeLabel || '其他' }}</span>
            <span class="font-semibold tabular-nums">{{ item.count }}</span>
            <span
              v-if="deltaInfo(item)"
              class="rounded-full bg-white/60 px-1 text-[10px] tabular-nums dark:bg-black/20"
              :class="deltaTone(item) === 'down' ? 'text-red-500' : ''"
              :title="`上次 ${item.prevDate || ''}：${item.prevCount ?? '-'} 次`"
            >
              {{ deltaInfo(item)?.text }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="!finished"
        ref="sentinel"
        class="flex items-center justify-center py-2 text-[10px] text-muted-foreground"
      >
        <span
          v-if="loadingMore"
          class="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-primary"
        ></span>
        <span v-else>向下滚动加载更多</span>
      </div>
      <div
        v-else-if="days.length > 0"
        class="py-2 text-center text-[10px] text-muted-foreground"
      >
        — 已经到底了 —
      </div>
    </div>
  </div>
</template>
