<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';
import { useEcharts, EchartsUI } from '@vben/plugins/echarts';
import { useUserStore } from '@vben/stores';

import {
  BarChartOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  FileTextOutlined,
  FireOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import { Card, Alert, message, Spin, theme } from 'ant-design-vue';
import dayjs from 'dayjs';

defineOptions({ name: 'GithubGraph' });

const userStore = useUserStore();
const username = computed(() => userStore.userInfo?.githubUsername);
const loading = ref(false);
const error = ref(false);
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { isDark } = usePreferences();
const { token } = theme.useToken();
const contributionData = ref<any>(null);

// Stats
const totalContributions = ref(0);
const maxContribution = ref(0);
const bestMonth = ref({ date: '', count: 0 });
const dailyAverage = ref('0');
const busiestDay = ref({ date: '', count: 0 });
const longestStreak = ref({ days: 0, start: '', end: '' });
const longestGap = ref({ days: 0, start: '', end: '' });

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
    { color: '#ebedf0', value: 0 },
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
    const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${user}?y=last`);
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    const data = await response.json();
    contributionData.value = data;
  } catch (err) {
    error.value = true;
    contributionData.value = null;
  } finally {
    loading.value = false;
  }
}

function updateChart() {
  const data = contributionData.value;
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

  // 1. Total & Max (Basic)
  const total = windowed.reduce((acc, item) => acc + item.count, 0);
  totalContributions.value = total;
  maxContribution.value = Math.max(...windowed.map((item) => item.count));

  // 2. Daily Average
  dailyAverage.value = (total / windowed.length).toFixed(1);

  // 3. Best Month
  const monthMap = new Map<string, number>();
  windowed.forEach((item) => {
    const month = item.date.substring(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) || 0) + item.count);
  });
  let maxMonthCount = 0;
  let maxMonthDate = '';
  for (const [month, count] of monthMap.entries()) {
    if (count > maxMonthCount) {
      maxMonthCount = count;
      maxMonthDate = month;
    }
  }
  bestMonth.value = {
    date: dayjs(maxMonthDate).format('YYYY年M月'),
    count: maxMonthCount,
  };

  // 4. Busiest Day
  const busiest = windowed.find((item) => item.count === maxContribution.value);
  if (busiest) {
    busiestDay.value = {
      date: dayjs(busiest.date).format('M月D日'),
      count: busiest.count,
    };
  }

  // 5. Longest Streak
  let maxStreak = 0;
  let currentStreak = 0;
  let maxStreakStart = '';
  let maxStreakEnd = '';
  let currentStreakStart = '';

  // 6. Longest Gap
  let maxGap = 0;
  let currentGap = 0;
  let maxGapStart = '';
  let maxGapEnd = '';
  let currentGapStart = '';

  windowed.forEach((item, index) => {
    // Streak Logic
    if (item.count > 0) {
      if (currentStreak === 0) {
        currentStreakStart = item.date;
      }
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = currentStreakStart;
        maxStreakEnd = item.date;
      }
    } else {
      currentStreak = 0;
    }

    // Gap Logic
    if (item.count === 0) {
      if (currentGap === 0) {
        currentGapStart = item.date;
      }
      currentGap++;
      if (currentGap > maxGap) {
        maxGap = currentGap;
        maxGapStart = currentGapStart;
        maxGapEnd = item.date;
      }
    } else {
      currentGap = 0;
    }
  });

  longestStreak.value = {
    days: maxStreak,
    start: maxStreak > 0 ? dayjs(maxStreakStart).format('M月D日') : '-',
    end: maxStreak > 0 ? dayjs(maxStreakEnd).format('M月D日') : '-',
  };

  longestGap.value = {
    days: maxGap,
    start: maxGap > 0 ? dayjs(maxGapStart).format('M月D日') : '-',
    end: maxGap > 0 ? dayjs(maxGapEnd).format('M月D日') : '-',
  };

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
      top: 45,
      left: 36,
      right: 12,
      range: [startDate, endDate],
      cellSize: 13,
      splitLine: {
        show: false,
      },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 0,
        nameMap: ['', 'Mon', '', 'Wed', '', 'Fri', ''],
        margin: 10,
        color: token.value.colorTextSecondary,
      },
      monthLabel: {
        margin: 10,
        color: token.value.colorTextSecondary,
      },
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: recentData,
      itemStyle: {
        borderRadius: 2,
        borderWidth: 3,
        borderColor: token.value.colorBgContainer,
      },
    },
  }));
}

let hasWarnedNoUsername = false;

watch(
  [contributionData, () => token.value.colorBgContainer, isDark],
  () => {
    updateChart();
  },
);

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
    await fetchContributions(user);
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
          <div class="min-w-[760px] pr-4">
            <!-- Stats Grid -->
            <div class="mb-6 grid grid-cols-1 gap-4 pl-9 md:grid-cols-3">
              <!-- Best Month -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900/30">
                    <CalendarOutlined class="text-lg text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">这一年的高光月份</div>
                    <div class="flex items-baseline gap-2">
                      <span class="text-base font-medium">{{ bestMonth.date }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Daily Average -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                    <BarChartOutlined class="text-lg text-green-600 dark:text-green-400" />
                  </div>
                  <div class="w-full">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-gray-500">日均贡献</div>
                      <span class="text-lg font-bold">{{ dailyAverage }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Total Contributions -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-purple-100 p-2 dark:bg-purple-900/30">
                    <FileTextOutlined class="text-lg text-purple-600 dark:text-purple-400" />
                  </div>
                  <div class="w-full">
                    <div class="flex items-center justify-between">
                      <div class="text-xs text-gray-500">最近一年总贡献</div>
                      <span class="text-lg font-bold">{{ totalContributions }}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Busiest Day -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-orange-100 p-2 dark:bg-orange-900/30">
                    <ThunderboltOutlined class="text-lg text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">你最活跃的一天</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ busiestDay.count }}</span>
                      <span class="text-xs text-gray-500">次贡献</span>
                    </div>
                    <div class="text-xs text-gray-400">{{ busiestDay.date }}</div>
                  </div>
                </div>
              </Card>

              <!-- Longest Streak -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                    <FireOutlined class="text-lg text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">最长连续打卡</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ longestStreak.days }}</span>
                      <span class="text-xs text-gray-500">天</span>
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ longestStreak.start }} - {{ longestStreak.end }}
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Longest Gap -->
              <Card :bordered="false" class="shadow-sm">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
                    <CoffeeOutlined class="text-lg text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div class="text-xs text-gray-500">休息最久的一段时间</div>
                    <div class="mt-1">
                      <span class="mr-1 text-2xl font-bold">{{ longestGap.days }}</span>
                      <span class="text-xs text-gray-500">天</span>
                    </div>
                    <div class="text-xs text-gray-400">
                      {{ longestGap.start }} - {{ longestGap.end }}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            <EchartsUI ref="chartRef" height="220px" />

            <div class="mr-4 mt-2 flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
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
