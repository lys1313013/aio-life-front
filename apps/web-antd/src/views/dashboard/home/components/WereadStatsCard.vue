<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type {
  WereadStatsBucket,
  WereadStatsGranularity,
  WereadStatsSection,
} from '#/api/core/home-sections';

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { useAccessStore, useUserStore } from '@vben/stores';

import { getWereadStats } from '#/api/core/home-sections';
import BusinessIcon from '#/components/BusinessIcon.vue';
import RefreshableCardHeader from '#/components/RefreshableCardHeader.vue';
import { useActiveRequest } from '#/composables/useActiveRequest';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { findMenuChain } from '#/utils/menu-chain';

import CardRefreshIndicator from './CardRefreshIndicator.vue';

const emit = defineEmits<{ visibility: [visible: boolean] }>();
const router = useRouter();
const access = useAccessStore();
const user = useUserStore();
const visuals = useMenuVisualsStore();
const locks = useSecondaryLockStore();

const STORAGE_PREFIX = 'home:weread-stats:granularity:';
const RETURN_STALE_MS = 5 * 60 * 1000;
const granularityOptions = [
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
] as const;

const identity = computed(
  () => user.userInfo?.userId || user.userInfo?.id || '',
);
const granularity = ref<WereadStatsGranularity>(readGranularity());
const data = ref<null | WereadStatsSection>(null);
const denied = ref(false);
const lastSuccess = ref(0);
let active = true;
let hasShownBars = false;
let resettingForIdentity = false;
let timer: ReturnType<typeof setInterval> | undefined;
let visibilityBound = false;

const chain = computed(() =>
  findMenuChain(
    access.accessMenus,
    [],
    [],
    visuals.cardMenu('section.weread-stats')?.menuId ?? undefined,
  ),
);
const path = computed(() => chain.value.at(-1)?.path);
const available = computed(() => !!path.value && !access.loginExpired);
const locked = computed(
  () =>
    !locks.loaded ||
    denied.value ||
    chain.value.some(
      (menu) =>
        (locks.isMenuLocked(String(menu.menuId)) &&
          !locks.isUnlocked(menu.path)) ||
        (locks.showModal && locks.pendingTargetPath === menu.path),
    ),
);

function storageKey() {
  return `${STORAGE_PREFIX}${identity.value}`;
}
function readGranularity(): WereadStatsGranularity {
  if (typeof window === 'undefined') return 'week';
  try {
    const value = window.localStorage.getItem(storageKey());
    return value === 'month' || value === 'year' ? value : 'week';
  } catch {
    return 'week';
  }
}
function persistGranularity(value: WereadStatsGranularity) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(), value);
  } catch {
    /* 隐私模式或存储不可用时只保留本次会话。 */
  }
}

const request = useActiveRequest<WereadStatsSection>({
  enabled: () => active && available.value && !locked.value,
  fetch: () => getWereadStats(granularity.value),
  reloadOnActivate: () => false,
  apply: (result) => {
    data.value = result;
    lastSuccess.value = Date.now();
  },
  onError: (error) => {
    if (
      (error as { response?: { data?: { code?: number } } })?.response?.data
        ?.code === 2001
    ) {
      denied.value = true;
      data.value = null;
    }
  },
  onSettled: scheduleRefresh,
});
const { loading, loaded, failed } = request;

const visible = computed(
  () =>
    available.value &&
    (denied.value ||
      locked.value ||
      failed.value ||
      !loaded.value ||
      data.value?.connected !== false),
);
watch(visible, (value) => emit('visibility', value), { immediate: true });

// 切换与重试期间保留旧数据，汇总文案与图表沿用同一份数据粒度。
const displayGranularity = computed(
  () => data.value?.granularity ?? granularity.value,
);
const periodLabel = computed(
  () =>
    ({ month: '本月', week: '本周', year: '本年' })[displayGranularity.value] ??
    '本周',
);
const previousLabel = computed(
  () =>
    ({ month: '上月', week: '上周', year: '上年' })[displayGranularity.value] ??
    '上周',
);
const emptyText = computed(
  () =>
    ({
      month: '本月还没有阅读记录',
      week: '本周还没有阅读记录',
      year: '本年还没有阅读记录',
    })[displayGranularity.value] ?? '还没有阅读记录',
);
const totalParts = computed(() =>
  data.value ? durationParts(data.value.totalSeconds) : [],
);
const totalText = computed(() =>
  data.value ? formatDuration(data.value.totalSeconds) : '—',
);
const averageText = computed(() =>
  data.value ? formatDuration(data.value.dailyAverageSeconds) : '—',
);
const change = computed<null | {
  direction: number;
  text: string;
  title: string;
}>(() => {
  const current = data.value;
  if (!current) return null;
  const previous = current.previousTotalSeconds;
  const total = current.totalSeconds;
  const title = `较${previousLabel.value}同期（${current.previousPeriodStart} 至 ${current.previousPeriodEnd}），上期 ${formatDuration(previous)}，本期 ${formatDuration(total)}`;
  if (previous <= 0) {
    return total <= 0
      ? { direction: 0, text: '—', title }
      : { direction: 1, text: '新增', title };
  }
  const percent = Math.round(((total - previous) / previous) * 100);
  if (percent === 0) return { direction: 0, text: '持平', title };
  return {
    direction: percent > 0 ? 1 : -1,
    text: `${percent > 0 ? '+' : ''}${percent}%`,
    title,
  };
});
const skeletonBars = computed(() =>
  granularity.value === 'week' ? 7 : granularity.value === 'month' ? 31 : 12,
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function durationParts(seconds: number) {
  if (!seconds || seconds <= 0) return [{ value: '0', unit: '分钟' }];
  if (seconds < 60) return [{ value: '不足 1', unit: '分钟' }];
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return [{ value: String(minutes), unit: '分钟' }];
  const parts = [{ value: String(Math.floor(minutes / 60)), unit: '小时' }];
  const rest = minutes % 60;
  if (rest > 0) parts.push({ value: String(rest), unit: '分' });
  return parts;
}

function formatDuration(seconds: number) {
  return durationParts(seconds)
    .map(({ value, unit }) => `${value} ${unit}`)
    .join(' ');
}

function bucketTitle(bucket: WereadStatsBucket, mode: WereadStatsGranularity) {
  if (mode === 'year') {
    const [year, month] = bucket.key.split('-');
    return `${year}年${Number(month)}月`;
  }
  const [, month, day] = bucket.key.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function draw() {
  const current = data.value;
  if (!current?.connected || !chartRef.value) return;

  const minutes = current.buckets.map((bucket) =>
    Math.max(0, bucket.seconds / 60),
  );
  const maxMinutes = Math.max(1, ...minutes);
  const barCount = minutes.filter((value) => value > 0).length;
  const delayStep = Math.min(150, 660 / Math.max(1, barCount - 1));
  let barIndex = 0;
  const barDelays = minutes.map((value) => {
    const delay = Math.round(barIndex * delayStep);
    if (value > 0) barIndex++;
    return delay;
  });
  const mode = current.granularity;

  function animateFirstBars() {
    if (hasShownBars || barCount === 0 || data.value !== current) return false;
    hasShownBars = true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  renderEcharts(() => ({
    animation: animateFirstBars(),
    animationDelay: (index: number) => barDelays[index] ?? 0,
    animationDuration: 180,
    grid: { bottom: 0, containLabel: true, left: 2, right: 2, top: 6 },
    tooltip: {
      axisPointer: { type: 'shadow' },
      confine: true,
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const bucket = current.buckets[item?.dataIndex];
        if (!bucket) return '';
        return `${bucketTitle(bucket, mode)}<br/>${
          bucket.seconds > 0 ? formatDuration(bucket.seconds) : '未阅读'
        }`;
      },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: {
        color: '#8c8c8c',
        fontSize: 10,
        interval: mode === 'month' ? (index: number) => index % 7 === 0 : 0,
        margin: 6,
      },
      axisLine: { lineStyle: { color: 'rgba(128, 128, 128, 0.25)' } },
      axisTick: { show: false },
      data: current.buckets.map((bucket) =>
        mode === 'week'
          ? bucket.label.replace(/^周/, '')
          : mode === 'year'
            ? bucket.label.replace(/月$/, '')
            : bucket.label,
      ),
      type: 'category',
    },
    yAxis: { max: maxMinutes, show: false, type: 'value' },
    series: [
      {
        barMaxWidth: mode === 'week' ? 36 : 24,
        barWidth: mode === 'week' ? '72%' : undefined,
        barMinHeight: 2,
        data: current.buckets.map((bucket, index) => ({
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color: '#34a6ff',
          },
          value: bucket.seconds > 0 ? minutes[index] : null,
        })),
        type: 'bar',
      },
    ],
  }));
}

function clearTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
function refreshInterval() {
  if (data.value?.connected === false) return 0;
  const seconds = data.value?.refreshInterval;
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
    ? seconds * 1000
    : 0;
}
function stale() {
  if (!lastSuccess.value) return true;
  return (
    refreshInterval() > 0 && Date.now() - lastSuccess.value >= refreshInterval()
  );
}
function canRefresh() {
  return (
    active &&
    document.visibilityState !== 'hidden' &&
    available.value &&
    !locked.value
  );
}
function scheduleRefresh() {
  clearTimer();
  if (!canRefresh() || refreshInterval() <= 0) return;
  timer = setInterval(
    () => {
      if (stale()) void request.load();
    },
    Math.min(refreshInterval(), 30_000),
  );
}
function resume() {
  if (canRefresh() && (stale() || failed.value)) void request.load();
  scheduleRefresh();
}
function visibilityChanged() {
  if (document.visibilityState === 'hidden') {
    clearTimer();
    request.invalidate();
  } else {
    resume();
  }
}

function openPage() {
  if (path.value) void router.push(path.value);
}
function changeGranularity(value: unknown) {
  const next = value === 'month' || value === 'year' ? value : 'week';
  if (next === granularity.value) return;
  granularity.value = next;
}

watch(granularity, (next) => {
  persistGranularity(next);
  if (resettingForIdentity || !available.value || locked.value) return;
  void request.load(true);
});
watch(
  identity,
  () => {
    hasShownBars = false;
  },
  { flush: 'sync' },
);
watch(
  [identity, available, locked],
  () => {
    request.invalidate();
    clearTimer();
    resettingForIdentity = true;
    granularity.value = readGranularity();
    resettingForIdentity = false;
    denied.value = false;
    data.value = null;
    lastSuccess.value = 0;
    loaded.value = false;
    failed.value = false;
    if (available.value && !locked.value) void request.load();
  },
  { flush: 'sync', immediate: true },
);
watch([data, chartRef], draw, { flush: 'post' });

onMounted(() => {
  void visuals.load();
  void locks.loadLockedMenus();
  document.addEventListener('visibilitychange', visibilityChanged);
  visibilityBound = true;
  resume();
});
onActivated(() => {
  active = true;
  if (
    available.value &&
    !locked.value &&
    (!loaded.value ||
      failed.value ||
      data.value?.connected === false ||
      !lastSuccess.value ||
      Date.now() - lastSuccess.value >= RETURN_STALE_MS)
  ) {
    void request.load();
  }
  resume();
});
onDeactivated(() => {
  active = false;
  clearTimer();
});
onBeforeUnmount(() => {
  clearTimer();
  if (visibilityBound) {
    document.removeEventListener('visibilitychange', visibilityChanged);
  }
});
</script>

<template>
  <section
    v-if="visible"
    class="dashboard-section relative flex h-[240px] min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground sm:h-[250px] lg:h-[280px]"
    aria-label="微信读书阅读统计"
    :aria-busy="loading"
  >
    <RefreshableCardHeader
      class="h-11 px-2.5 sm:px-3"
      label="刷新阅读统计"
      :error="failed && loaded"
      :loading="loading"
      :refresh="() => request.load(true)"
    >
      <button
        type="button"
        class="pointer-events-auto flex min-h-11 items-center gap-2 text-base font-semibold hover:text-primary"
        aria-label="查看微信读书"
        @click.stop="openPage"
      >
        <BusinessIcon card-key="section.weread-stats" class="size-4" />阅读统计
      </button>
      <div
        class="pointer-events-auto relative z-10 flex shrink-0 gap-0.5 rounded-lg bg-muted p-[3px]"
        role="group"
        aria-label="阅读统计粒度"
      >
        <button
          v-for="option in granularityOptions"
          :key="option.value"
          type="button"
          class="min-h-[26px] min-w-[30px] cursor-pointer rounded-md px-2 py-0.5 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-default"
          :class="
            granularity === option.value
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
          :disabled="loading || locked"
          :aria-label="`按${option.label}统计`"
          :aria-pressed="granularity === option.value"
          @click.stop="changeGranularity(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </RefreshableCardHeader>

    <div
      v-if="locked"
      class="flex flex-1 items-center justify-center text-sm text-muted-foreground"
    >
      <button type="button" class="min-h-11 px-3" @click.stop="openPage">
        点击解锁
      </button>
    </div>

    <div
      v-else-if="!loaded && loading"
      class="flex min-h-0 flex-1 flex-col gap-1 px-2.5 pb-2 sm:px-3"
      role="status"
      aria-label="正在加载阅读统计"
    >
      <div class="h-6 w-36 animate-pulse rounded bg-muted-foreground/20"></div>
      <div class="h-3 w-24 animate-pulse rounded bg-muted-foreground/20"></div>
      <div class="mt-auto flex h-[100px] items-end gap-1.5" aria-hidden="true">
        <span
          v-for="index in skeletonBars"
          :key="index"
          class="flex-1 animate-pulse rounded-t bg-muted-foreground/20"
          :style="{ height: `${25 + ((index * 17) % 60)}%` }"
        ></span>
      </div>
    </div>

    <div
      v-else-if="failed && !loaded"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <span>阅读统计加载失败</span>
      <button
        type="button"
        class="rounded px-3 py-1 text-primary hover:bg-accent"
        @click.stop="request.load(true)"
      >
        重试
      </button>
    </div>

    <div
      v-else-if="data"
      class="flex min-h-0 flex-1 flex-col px-2.5 pb-2 sm:px-3"
    >
      <div class="flex items-baseline justify-between gap-2">
        <div
          class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5"
          role="group"
          :aria-label="`${periodLabel} ${totalText}`"
        >
          <span class="text-xs text-muted-foreground" aria-hidden="true">{{
            periodLabel
          }}</span>
          <span
            v-for="part in totalParts"
            :key="part.unit"
            class="inline-flex items-baseline gap-1 whitespace-nowrap"
            aria-hidden="true"
          >
            <span class="text-base font-medium tabular-nums leading-6">{{
              part.value
            }}</span>
            <span class="text-xs font-normal text-muted-foreground">{{
              part.unit
            }}</span>
          </span>
        </div>
      </div>
      <div
        class="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs text-muted-foreground"
      >
        <span>日均 {{ averageText }}</span>
        <span
          v-if="change"
          class="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap"
          :title="change.title"
          :aria-label="`${change.title}，${change.text}`"
        >
          <span class="mr-1">比{{ previousLabel }}</span>
          <span v-if="change.direction > 0" aria-hidden="true">↑</span>
          <span v-else-if="change.direction < 0" aria-hidden="true">↓</span>
          {{ change.text }}
        </span>
      </div>
      <div class="relative mt-1 min-h-0 flex-1">
        <EchartsUI ref="chartRef" height="100%" width="100%" />
        <div
          v-if="data.totalSeconds === 0"
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
        >
          {{ emptyText }}
        </div>
        <div
          v-if="loading && loaded"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/40"
        >
          <CardRefreshIndicator />
        </div>
      </div>
    </div>
  </section>
</template>
