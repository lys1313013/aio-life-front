<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';
import { useEcharts, EchartsUI } from '@vben/plugins/echarts';
import { useUserStore } from '@vben/stores';

import { Alert, message, Spin, theme } from 'ant-design-vue';

defineOptions({ name: 'GithubGraph' });

const userStore = useUserStore();
const username = computed(() => userStore.userInfo?.githubUsername);
const loading = ref(false);
const error = ref(false);
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
const { token } = theme.useToken();

const colorPieces = computed(() => {
  if (isDark.value) {
    return [
      { color: '#161b22', value: 0 },
      { color: '#0e4429', value: 1 },
      { color: '#006d32', value: 2 },
      { color: '#26a641', value: 3 },
      { color: '#39d353', value: 4 },
    ];
  }

  return [
    { color: '#e5e7eb', value: 0 },
    { color: '#9be9a8', value: 1 },
    { color: '#40c463', value: 2 },
    { color: '#30a14e', value: 3 },
    { color: '#216e39', value: 4 },
  ];
});

const legendColors = computed(() => colorPieces.value.map((p) => p.color));

async function fetchContributions(user: string) {
  try {
    loading.value = true;
    error.value = false;
    const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await response.json();
    return data;
  } catch (err) {
    error.value = true;
    return null;
  } finally {
    loading.value = false;
  }
}

function updateChart(data: any) {
  if (!data || !data.contributions) return;

  const contributions = data.contributions as Array<{
    count: number;
    date: string;
    level: number;
  }>;

  const today = new Date().toISOString().slice(0, 10);
  const filtered = contributions.filter((item) => item.date <= today);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  const windowed = filtered.slice(-371);
  if (windowed.length === 0) return;

  const recentData = windowed.map((item) => [item.date, item.level, item.count]);

  const startDate = recentData.at(0)?.[0];
  const endDate = recentData.at(-1)?.[0];
  if (!startDate || !endDate) return;

  renderEcharts(() => ({
    tooltip: {
      formatter: (params: any) => {
        const date = params?.value?.[0] ?? '';
        const count = params?.value?.[2] ?? 0;
        return `${date}<br/>Contributions: <strong>${count}</strong>`;
      },
      backgroundColor: token.value.colorBgElevated,
      borderColor: token.value.colorBorderSecondary,
      textStyle: {
        color: token.value.colorText,
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 4,
      dimension: 1,
      type: 'piecewise',
      pieces: colorPieces.value.map((p) => ({ value: p.value, color: p.color })),
    },
    calendar: {
      top: 10,
      left: 36,
      right: 12,
      range: [startDate, endDate],
      cellSize: ['auto', 13],
      splitLine: {
        show: false,
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 0,
        nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
        margin: 10,
      },
      monthLabel: {
        margin: 12,
      },
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: recentData,
      itemStyle: {
        borderRadius: 2,
        borderWidth: 2,
        borderColor: token.value.colorBorderSecondary,
      },
    },
  }));
}

let hasWarnedNoUsername = false;

watch(
  username,
  async (user) => {
    if (!user) {
      if (!hasWarnedNoUsername) {
        message.warning('未设置 Github 用户名，无法显示贡献图');
        hasWarnedNoUsername = true;
      }
      return;
    }
    hasWarnedNoUsername = false;
    const data = await fetchContributions(user);
    if (data) {
      updateChart(data);
    }
  },
  { immediate: true },
);
</script>

<template>
  <Page title="Github 贡献图">
    <div class="p-4">
      <Spin :spinning="loading" tip="加载中...">
        <div v-if="error" class="w-full py-12 text-center">
          <Alert
            description="无法加载数据，请检查网络连接。"
            message="加载失败"
            show-icon
            type="error"
            class="inline-block text-left"
          />
        </div>

        <div v-show="!error && !loading" class="w-full overflow-x-auto">
          <div class="min-w-0">
            <EchartsUI ref="chartRef" height="190px" />

            <div class="mt-2 flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Less</span>
              <span
                v-for="(c, idx) in legendColors"
                :key="idx"
                class="h-3 w-3 rounded-[2px] ring-1 ring-black/5 dark:ring-white/10"
                :style="{ backgroundColor: c }"
              />
              <span>More</span>
            </div>
          </div>
        </div>
      </Spin>
    </div>
  </Page>
</template>
