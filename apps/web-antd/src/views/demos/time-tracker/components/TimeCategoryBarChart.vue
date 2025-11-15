<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { TimeSlot, TimeSlotCategory } from '../types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card } from 'ant-design-vue';
import dayjs from 'dayjs';

interface Props {
  timeSlots: TimeSlot[];
  categories: TimeSlotCategory[];
  selectedDate: dayjs.Dayjs;
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const categoryDurations = computed(() => {
  const durations: Record<string, number> = {};
  props.timeSlots.forEach(slot => {
    const duration = slot.endTime - slot.startTime + 1;
    durations[slot.categoryId] = (durations[slot.categoryId] || 0) + duration;
  });
  return durations;
});

const barChartData = computed(() => {
  const items = props.categories
    .map(category => {
      const value = categoryDurations.value[category.id] || 0;
      return {
        name: category.name,
        value,
        itemStyle: { color: category.color }
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

  return items;
});

const renderBarChart = () => {
  if (!chartRef.value) return;

  const names = barChartData.value.map(i => i.name);
  const values = barChartData.value.map(i => i.value);

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const duration = p.value;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return `${p.name}<br/>${hours}小时${minutes}分钟\n总时长: ${duration}分钟`;
      }
    },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      splitLine: { show: true }
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
            return duration >= 60 ? `${hours}h${minutes}m` : `${minutes}m`;
          },
          fontSize: 10
        },
        itemStyle: {
          borderRadius: [6, 6, 0, 0]
        }
      }
    ]
  };

  renderEcharts(options);
};

watch([barChartData, props.selectedDate], () => {
  renderBarChart();
}, { immediate: true });

onMounted(() => {
  renderBarChart();
});
</script>

<template>
  <Card title="时间分类柱状图" class="bar-chart-card">
    <div class="bar-chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<style scoped>
.bar-chart-card {
  min-width: 400px;
  flex: 2;
}
.bar-chart-container {
  height: 300px;
  width: 100%;
}
</style>
