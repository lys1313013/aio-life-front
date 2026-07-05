<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { MergedCategory, TimeSlot, TimeSlotCategory } from '../types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getCategoryColor, getCategoryName } from '../config';

interface Props {
  timeSlots: TimeSlot[];
  categories: (MergedCategory | TimeSlotCategory)[];
  selectedDate: dayjs.Dayjs;
  selectedFilterCategoryIds?: null | string[];
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const categoryDurations = computed(() => {
  const durations: Record<string, number> = {};
  props.timeSlots.forEach((slot) => {
    // 如果有分类过滤，且当前 slot 不属于过滤分类，则跳过
    if (
      props.selectedFilterCategoryIds &&
      props.selectedFilterCategoryIds.length > 0 &&
      !props.selectedFilterCategoryIds.includes(slot.categoryId)
    ) {
      return;
    }
    const duration = slot.endTime - slot.startTime + 1;
    durations[slot.categoryId] = (durations[slot.categoryId] || 0) + duration;
  });
  return durations;
});

// 统计有数据的有效天数（按周/月用于平均）
const activeDaysCount = computed(() => {
  const dates = new Set<string>();
  props.timeSlots.forEach((s) => {
    if (s && s.date) {
      dates.add(s.date);
    }
  });
  return dates.size;
});

const barChartData = computed(() => {
  const divisor = Math.max(activeDaysCount.value, 1);
  const items = props.categories
    .map((category) => {
      const total = categoryDurations.value[category.id] || 0;
      const avg = Math.round(total / divisor);
      return {
        name: getCategoryName(category.id, props.categories),
        value: avg,
        total,
        itemStyle: { color: getCategoryColor(category.id, props.categories) },
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.value - a.value);

  return items;
});

const renderBarChart = () => {
  if (!chartRef.value) return;

  const names = barChartData.value.map((i) => i.name);

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const avg = p.value as number;
        const total =
          p.data && typeof p.data.total === 'number' ? p.data.total : avg;
        const avgHours = Math.floor(avg / 60);
        const avgMinutes = avg % 60;
        const totalHours = Math.floor(total / 60);
        const totalMinutes = total % 60;
        if (activeDaysCount.value > 1) {
          return `${p.name}<br/>日均: ${avgHours}h${avgMinutes}m\n总: ${totalHours}h${totalMinutes}m\n`;
        }
        return `${p.name}<br/>${avgHours}小时${avgMinutes}分钟\n总时长: ${total}分钟`;
      },
    },
    grid: { left: 12, right: 12, top: 30, bottom: 15, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { interval: 0 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { show: false },
      splitLine: { show: true },
    },
    series: [
      {
        type: 'bar',
        data: barChartData.value,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const duration = params.value;
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const text =
              duration >= 60 ? `${hours}h${minutes}m` : `${minutes}m`;
            return text;
          },
          fontSize: 10,
        },
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  renderEcharts(options as any);
};

watch(
  [barChartData, () => props.selectedDate],
  () => {
    renderBarChart();
  },
  { immediate: true },
);

onMounted(() => {
  renderBarChart();
});
</script>

<template>
  <Card
    class="bar-chart-card overflow-hidden shadow-sm"
    :body-style="{ padding: '0 10px' }"
  >
    <div class="bar-chart-container">
      <EchartsUI ref="chartRef" height="320px" />
    </div>
  </Card>
</template>

<style scoped>
.bar-chart-card {
  flex: 2;
  width: 100%;
  min-width: 300px;
}

.bar-chart-card :deep(.ant-card-body) {
  padding: 0 10px !important;
}

.bar-chart-container {
  width: 100%;
  height: 320px;
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
