<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { MergedCategory, TimeSlot, TimeSlotCategory } from '../types';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';

import { queryByDateRange } from '#/api/core/time-tracker';
import { getCategoryColor, getCategoryName } from '../config';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

interface Props {
  categories: (MergedCategory | TimeSlotCategory)[];
  selectedDate: dayjs.Dayjs;
  statMode: 'day' | 'month' | 'week';
  selectedFilterCategoryIds?: null | string[];
  refreshKey?: number;
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const loading = ref(false);
const trendData = ref<TimeSlot[]>([]);

const fetchTrendData = async () => {
  loading.value = true;
  try {
    let startDate: string;
    let endDate: string;

    if (props.statMode === 'day') {
      startDate = props.selectedDate.subtract(9, 'day').format('YYYY-MM-DD');
      endDate = props.selectedDate.format('YYYY-MM-DD');
    } else if (props.statMode === 'week') {
      startDate = props.selectedDate
        .subtract(9, 'week')
        .startOf('isoWeek')
        .format('YYYY-MM-DD');
      endDate = props.selectedDate.endOf('isoWeek').format('YYYY-MM-DD');
    } else {
      startDate = props.selectedDate
        .subtract(9, 'month')
        .startOf('month')
        .format('YYYY-MM-DD');
      endDate = props.selectedDate.endOf('month').format('YYYY-MM-DD');
    }

    const data = await queryByDateRange({
      condition: { startDate, endDate },
    });

    trendData.value = Array.isArray(data) ? data : (data as any)?.items || [];
  } catch {
    trendData.value = [];
  } finally {
    loading.value = false;
  }
};

const chartData = computed(() => {
  const xAxisData: string[] = [];
  const seriesData: Record<string, number[]> = {};

  const filteredCategories =
    props.selectedFilterCategoryIds &&
    props.selectedFilterCategoryIds.length > 0
      ? props.categories.filter((c) =>
          props.selectedFilterCategoryIds?.includes(c.id),
        )
      : props.categories;

  filteredCategories.forEach((cat) => {
    seriesData[cat.id] = [];
  });

  if (props.statMode === 'day') {
    for (let i = 9; i >= 0; i--) {
      const date = props.selectedDate.subtract(i, 'day');
      xAxisData.push(date.format('MM/DD'));
      const dateStr = date.format('YYYY-MM-DD');

      filteredCategories.forEach((cat) => {
        const duration = trendData.value
          .filter((s) => s.date === dateStr && s.categoryId === cat.id)
          .reduce((sum, s) => sum + (s.endTime - s.startTime + 1), 0);
        seriesData[cat.id]!.push(duration);
      });
    }
  } else if (props.statMode === 'week') {
    for (let i = 9; i >= 0; i--) {
      const weekStart = props.selectedDate
        .subtract(i, 'week')
        .startOf('isoWeek');
      const weekEnd = weekStart.endOf('isoWeek');
      const weekNum = weekStart.isoWeek();
      xAxisData.push(`${weekNum}周`);

      // 统计该周有记录的天数（不区分分类）
      const weekDates = new Set(
        trendData.value
          .filter((s) => {
            const d = dayjs(s.date);
            return (
              (d.isAfter(weekStart, 'day') ||
                d.isSame(weekStart, 'day')) &&
              (d.isBefore(weekEnd, 'day') ||
                d.isSame(weekEnd, 'day'))
            );
          })
          .map((s) => s.date),
      );
      const activeDays = weekDates.size || 1;

      filteredCategories.forEach((cat) => {
        const total = trendData.value
          .filter((s) => {
            const slotDate = dayjs(s.date);
            return (
              s.categoryId === cat.id &&
              (slotDate.isAfter(weekStart, 'day') ||
                slotDate.isSame(weekStart, 'day')) &&
              (slotDate.isBefore(weekEnd, 'day') ||
                slotDate.isSame(weekEnd, 'day'))
            );
          })
          .reduce((sum, s) => sum + (s.endTime - s.startTime + 1), 0);
        seriesData[cat.id]!.push(Math.round(total / activeDays));
      });
    }
  } else {
    for (let i = 9; i >= 0; i--) {
      const monthStart = props.selectedDate
        .subtract(i, 'month')
        .startOf('month');
      xAxisData.push(monthStart.format('M月'));

      const monthEnd = monthStart.endOf('month');

      // 统计该月有记录的天数（不区分分类）
      const monthDates = new Set(
        trendData.value
          .filter((s) => {
            const d = dayjs(s.date);
            return (
              (d.isAfter(monthStart, 'day') ||
                d.isSame(monthStart, 'day')) &&
              (d.isBefore(monthEnd, 'day') ||
                d.isSame(monthEnd, 'day'))
            );
          })
          .map((s) => s.date),
      );
      const activeDays = monthDates.size || 1;

      filteredCategories.forEach((cat) => {
        const total = trendData.value
          .filter((s) => {
            const slotDate = dayjs(s.date);
            return (
              s.categoryId === cat.id &&
              (slotDate.isAfter(monthStart, 'day') ||
                slotDate.isSame(monthStart, 'day')) &&
              (slotDate.isBefore(monthEnd, 'day') ||
                slotDate.isSame(monthEnd, 'day'))
            );
          })
          .reduce((sum, s) => sum + (s.endTime - s.startTime + 1), 0);
        seriesData[cat.id]!.push(Math.round(total / activeDays));
      });
    }
  }

  return { xAxisData, seriesData, filteredCategories };
});

const renderChart = async () => {
  await nextTick();
  if (!chartRef.value) return;

  const { xAxisData, seriesData, filteredCategories } = chartData.value;

  const formatLabel = (v: number) => {
    if (!v) return '';
    const h = Math.floor(v / 60);
    const m = Math.floor(v % 60);
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  };

  const series = filteredCategories
    .map((cat) => {
      const rawData = seriesData[cat.id] || [];
      const maxVal = Math.max(...rawData, 0);
      return {
        name: getCategoryName(cat.id, props.categories),
        type: 'line',
        data: rawData.map((v) => ({
          value: v,
          label: {
            show: v === maxVal && v > 0,
            position: 'top',
            fontSize: 10,
            color: getCategoryColor(cat.id, props.categories),
            formatter: () => formatLabel(v),
          },
        })),
        itemStyle: { color: getCategoryColor(cat.id, props.categories) },
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 4,
        smooth: false,
        emphasis: { focus: 'series' },
      };
    })
    .filter((s) => s.data.some((d: any) => d.value > 0))
    .sort((a, b) => {
      const sumA = (a.data as any[]).reduce((x, d) => x + d.value, 0);
      const sumB = (b.data as any[]).reduce((x, d) => x + d.value, 0);
      return sumB - sumA;
    });

  // 无筛选时只展示 Top 8 分类，减少折线杂乱
  const displaySeries =
    !props.selectedFilterCategoryIds ||
    props.selectedFilterCategoryIds.length === 0
      ? series.slice(0, 5)
      : series;

  const options = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params];
        const nonZero = items.filter((p: any) => p.value > 0);
        if (nonZero.length === 0) return '';
        let result = `${nonZero[0].axisValueLabel}<br/>`;
        nonZero.forEach((p: any) => {
          const hours = Math.floor(p.value / 60);
          const minutes = Math.floor(p.value % 60);
          const timeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
          result += `${p.marker} ${p.seriesName}: ${timeStr}<br/>`;
        });
        return result;
      },
    },
    legend: { show: false },
    grid: { left: '20px', right: '20px', top: '40px', bottom: '10px' },
    xAxis: { type: 'category', boundaryGap: false, data: xAxisData },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
    },
    series: displaySeries,
  };

  renderEcharts(options as any);
};

watch(
  [
    () => props.statMode,
    () => props.selectedDate,
    () => props.selectedFilterCategoryIds,
    () => props.refreshKey,
  ],
  () => {
    fetchTrendData();
  },
  { immediate: true },
);

watch(trendData, () => renderChart(), { immediate: true });

onMounted(() => {
  renderChart();
});
</script>

<template>
  <Card class="chart-card overflow-hidden shadow-sm" :body-style="{ padding: '12px' }">
    <div class="chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<style scoped>
.chart-card {
  flex: 2;
  width: 100%;
  min-width: 300px;
}

.chart-container {
  width: 100%;
  height: 320px;
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
