<script lang="ts" setup>
import type {
  ExerciseDashboardDayVO,
  ExerciseDashboardItemVO,
} from '#/api/core/exerciseRecord';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Skeleton } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getDashboardSummaryApi } from '#/api/core/exerciseRecord';

import ExerciseTrend from './ExerciseTrend.vue';

const emit = defineEmits<{
  loaded: [isEmpty: boolean];
}>();

const PAGE_SIZE = 7;

const days = ref<ExerciseDashboardDayVO[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const loaded = ref(false);
const failed = ref(false);
const loadMoreFailed = ref(false);
const finished = ref(false);
const cursor = ref<string | undefined>(undefined);
const scrollRoot = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const rows = computed(() =>
  days.value.flatMap((day) =>
    (day.items || []).map((item, index) => ({
      date: day.date,
      first: index === 0,
      item,
      // 老接口未提供趋势时只展示真实已有点，不用零值补齐。
      trend: item.trend?.length
        ? item.trend.slice(-5)
        : [
            ...(item.prevDate && item.prevCount != null
              ? [{ date: item.prevDate, count: item.prevCount }]
              : []),
            ...(day.date && item.count != null
              ? [{ date: day.date, count: item.count }]
              : []),
          ],
    })),
  ),
);

function logError(scope: string, error: any) {
  const status = error?.response?.status;
  const url = error?.config?.url;
  const data = error?.response?.data;
  const message =
    data?.result ||
    error?.result ||
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
  loadMoreFailed.value = false;
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
    loadMoreFailed.value = true;
    logError('loadPage', error);
  } finally {
    loadingMore.value = false;
  }
}

async function init() {
  loading.value = true;
  failed.value = false;
  loadMoreFailed.value = false;
  try {
    const res = await getDashboardSummaryApi({
      lastDate: undefined,
      limit: PAGE_SIZE,
    });
    const incoming = res?.days || [];
    days.value = incoming;
    cursor.value = res?.lastDate;
    finished.value = !res?.hasMore || incoming.length === 0;
  } catch (error) {
    failed.value = true;
    logError('init', error);
  } finally {
    loading.value = false;
    loaded.value = true;
    emit('loaded', !failed.value && days.value.length === 0);
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
  if (
    loading.value ||
    loadingMore.value ||
    finished.value ||
    failed.value ||
    loadMoreFailed.value
  )
    return;
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
  const sign = delta > 0 ? '+' : '';
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '=';
  const abs = `${sign}${delta}`;
  const text = `${arrow} ${abs}`;
  let tone: DeltaInfo['tone'] = 'neutral';
  if (delta > 0) tone = 'up';
  else if (delta < 0) tone = 'down';
  return { text, tone };
}

function deltaTone(item: ExerciseDashboardItemVO): DeltaInfo['tone'] {
  return deltaInfo(item)?.tone || 'neutral';
}

async function reload() {
  if (loading.value || loadingMore.value) return;
  observer?.disconnect();
  await init();
  await nextTick();
  setupObserver();
}

onMounted(async () => {
  await init();
  await nextTick();
  setupObserver();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

defineExpose({ reload });
</script>

<template>
  <div class="exercise-summary flex min-h-0 min-w-0 flex-1 flex-col">
    <div
      v-if="loading"
      class="flex-1 space-y-1 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <Skeleton
        v-for="i in 4"
        :key="i"
        :title="{ width: '30%' }"
        :paragraph="{ rows: 1, width: '60%' }"
        active
        class="!w-full"
      />
    </div>

    <div
      v-else-if="failed && days.length === 0"
      class="flex flex-1 items-center justify-center gap-2 py-6 text-xs text-muted-foreground"
      role="status"
    >
      <span>加载失败</span>
      <button
        type="button"
        aria-label="重新加载运动记录"
        class="rounded p-2 text-primary focus-visible:outline"
        @click="reload"
      >
        <VbenIcon icon="mdi:refresh" class="size-4" />
      </button>
    </div>

    <div
      v-else-if="loaded && days.length === 0"
      class="m-2.5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-4 text-center sm:m-3"
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
      class="exercise-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2.5 sm:px-3 sm:pb-3"
      @scroll.passive="maybeLoadMore"
    >
      <button
        v-if="failed"
        type="button"
        class="mb-1 flex w-full items-center justify-center gap-1 py-1 text-xs text-muted-foreground"
        aria-label="刷新运动记录失败，重试"
        @click="reload"
      >
        <span>刷新失败</span><VbenIcon icon="mdi:refresh" class="size-3" />
      </button>
      <div
        v-for="(row, index) in rows"
        :key="`${row.date}-${row.item.exerciseTypeId}-${index}`"
        class="exercise-row"
      >
        <div class="exercise-date text-muted-foreground">
          <template v-if="row.first">
            <span class="tabular-nums">{{ formatDate(row.date) }}</span>
            <span class="exercise-weekday">{{ weekday(row.date) }}</span>
          </template>
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <VbenIcon
            :icon="itemIcon(row.item)"
            class="exercise-icon size-3.5 shrink-0"
            :style="{ color: itemColor(row.item) }"
          />
          <span class="exercise-name text-foreground">
            {{ row.item.typeLabel || '其他' }}
          </span>
        </div>
        <div class="exercise-values tabular-nums">
          <span class="exercise-count text-foreground">{{
            row.item.count
          }}</span>
          <span
            class="exercise-delta"
            :class="{
              'text-emerald-600 dark:text-emerald-400':
                deltaTone(row.item) === 'up',
              'text-destructive': deltaTone(row.item) === 'down',
              'text-muted-foreground': ['neutral', 'new'].includes(
                deltaTone(row.item),
              ),
            }"
            :title="
              row.item.prevCount == null
                ? '首次记录'
                : `上次 ${row.item.prevDate || ''}：${row.item.prevCount} 次`
            "
          >
            {{ deltaInfo(row.item)?.text }}
          </span>
        </div>
        <ExerciseTrend
          :color="itemColor(row.item)"
          :label="row.item.typeLabel || '其他'"
          :trend="row.trend"
        />
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
        <button
          v-else-if="loadMoreFailed"
          type="button"
          aria-label="加载更多运动记录失败，重试"
          class="rounded p-1 text-primary focus-visible:outline"
          @click="loadPage"
        >
          <VbenIcon icon="mdi:refresh" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exercise-summary {
  container-type: inline-size;
}

.exercise-scroll {
  max-height: 240px;
}

.exercise-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) minmax(82px, max-content) clamp(
      56px,
      18cqw,
      80px
    );
  column-gap: 10px;
  align-items: center;
  min-height: 40px;
  padding: 3px 0;
  font-size: 12px;
}

.exercise-date {
  display: flex;
  gap: 5px;
  align-items: baseline;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
}

.exercise-weekday {
  font-size: 10px;
  opacity: 0.7;
}

.exercise-icon {
  opacity: 0.85;
}

.exercise-name {
  overflow-wrap: anywhere;
  font-weight: 400;
  line-height: 1.4;
}

.exercise-values {
  display: grid;
  grid-template-columns: minmax(30px, max-content) minmax(36px, max-content);
  gap: 8px;
  align-items: baseline;
  justify-content: end;
  padding-right: 8px;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
}

.exercise-count {
  font-size: 13px;
  font-weight: 600;
}

.exercise-delta {
  font-size: 10px;
  opacity: 0.85;
}

@container (max-width: 330px) {
  .exercise-row {
    grid-template-columns: 60px minmax(0, 1fr) minmax(66px, max-content) 48px;
    column-gap: 6px;
    min-height: 38px;
  }

  .exercise-values {
    grid-template-columns: minmax(24px, max-content) minmax(32px, max-content);
    gap: 4px;
    padding-right: 6px;
  }
}

@container (max-width: 280px) {
  .exercise-row {
    grid-template-columns: 56px minmax(0, 1fr) minmax(66px, max-content) 40px;
    column-gap: 5px;
    font-size: 11px;
  }
}
</style>
