<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type {
  WereadStatsBucket,
  WereadStatsGranularity,
  WereadStatsSection,
} from '#/api/core/home-sections';

import {
  computed,
  nextTick,
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

import { Segmented } from 'ant-design-vue';

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

const periodLabel = computed(
  () =>
    ({ month: '本月', week: '本周', year: '本年' })[granularity.value] ??
    '本周',
);
const previousLabel = computed(
  () =>
    ({ month: '上月', week: '上周', year: '上年' })[granularity.value] ??
    '上周',
);
const emptyText = computed(
  () =>
    ({
      month: '本月还没有阅读记录',
      week: '本周还没有阅读记录',
      year: '本年还没有阅读记录',
    })[granularity.value] ?? '还没有阅读记录',
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
  const title = `较${previousLabel.value}同期`;
  const previous = current.previousTotalSeconds;
  const total = current.totalSeconds;
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
const chartColor = computed(
  () =>
    visuals.visual('section.weread-stats').iconColor ||
    cssHsl('--primary') ||
    'hsl(212, 100%, 45%)',
);
const skeletonBars = computed(() =>
  granularity.value === 'week' ? 7 : granularity.value === 'month' ? 31 : 12,
);

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

function cssHsl(name: string) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parts = raw.split(/\s+/);
  return parts.length === 3 ? `hsl(${parts.join(', ')})` : '';
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return '0 分钟';
  if (seconds < 60) return '不足 1 分钟';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

function bucketTitle(bucket: WereadStatsBucket, mode: WereadStatsGranularity) {
  if (mode === 'year') {
    const [year, month] = bucket.key.split('-');
    return `${year}年${Number(month)}月`;
  }
  const [, month, day] = bucket.key.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

async function draw() {
  const current = data.value;
  if (!current) return;
  const minutes = current.buckets.map((bucket) =>
    Math.max(0, Math.round(bucket.seconds / 60)),
  );
  const maxMinutes = Math.max(1, ...minutes);
  const mode = current.granularity;
  await nextTick();
  renderEcharts({
    animationDuration: 240,
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
      data: current.buckets.map((bucket) => bucket.label),
      type: 'category',
    },
    yAxis: { max: maxMinutes, show: false, type: 'value' },
    series: [
      {
        barMaxWidth: 24,
        barMinHeight: 2,
        data: current.buckets.map((bucket, index) => ({
          itemStyle: {
            borderRadius: [3, 3, 0, 0],
            color:
              bucket.seconds > 0 ? chartColor.value : 'rgba(128,128,128,0.35)',
          },
          value: minutes[index],
        })),
        type: 'bar',
      },
    ],
  });
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
function resume() {
  clearTimer();
  if (
    !active ||
    document.visibilityState === 'hidden' ||
    !available.value ||
    locked.value
  )
    return;
  if (stale() || failed.value) void request.load();
  if (refreshInterval() <= 0) return;
  timer = setInterval(
    () => {
      if (stale()) void request.load();
    },
    Math.min(refreshInterval(), 30_000),
  );
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
  [identity, available, locked],
  () => {
    request.invalidate();
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
watch([data, chartColor], () => void draw());

onMounted(() => {
  void visuals.load();
  void locks.loadLockedMenus();
  document.addEventListener('visibilitychange', visibilityChanged);
  visibilityBound = true;
  void draw();
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
      <div class="pointer-events-auto relative z-10">
        <Segmented
          :disabled="loading || locked"
          :options="[...granularityOptions]"
          :value="granularity"
          aria-label="阅读统计粒度"
          size="small"
          @change="changeGranularity"
        />
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
      <div class="h-5 w-32 animate-pulse rounded bg-muted-foreground/20"></div>
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
        <span
          class="min-w-0 truncate text-lg font-semibold tabular-nums lg:text-xl"
        >
          {{ periodLabel }} {{ totalText }}
        </span>
        <span
          v-if="change"
          class="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground"
          :title="change.title"
        >
          <span v-if="change.direction > 0" aria-hidden="true">↑</span>
          <span v-else-if="change.direction < 0" aria-hidden="true">↓</span>
          {{ change.text }}
        </span>
      </div>
      <div class="mt-0.5 text-xs text-muted-foreground">
        日均 {{ averageText }}
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
