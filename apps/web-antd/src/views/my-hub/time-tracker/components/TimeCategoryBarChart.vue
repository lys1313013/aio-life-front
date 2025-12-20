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

// 统计有数据的有效天数（按周/月用于平均）
const activeDaysCount = computed(() => {
  const dates = new Set<string>();
  props.timeSlots.forEach(s => {
    if (s && s.date) {
      dates.add(s.date);
    }
  });
  return dates.size;
});

const barChartData = computed(() => {
  const divisor = Math.max(activeDaysCount.value, 1);
  const items = props.categories
    .map(category => {
      const total = categoryDurations.value[category.id] || 0;
      const avg = Math.round(total / divisor);
      return {
        name: category.name,
        value: avg,
        total,
        itemStyle: { color: category.color }
      };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.value - a.value);

  return items;
});

const renderBarChart = () => {
  if (!chartRef.value) return;

  const names = barChartData.value.map(i => i.name);

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const avg = p.value as number;
        const total = (p.data && typeof p.data.total === 'number') ? p.data.total : avg;
        const avgHours = Math.floor(avg / 60);
        const avgMinutes = avg % 60;
        const totalHours = Math.floor(total / 60);
        const totalMinutes = total % 60;
        if (activeDaysCount.value > 1) {
          return `${p.name}<br/>日均: ${avgHours}h${avgMinutes}m\n总: ${totalHours}h${totalMinutes}m\n`;
        }
        return `${p.name}<br/>${avgHours}小时${avgMinutes}分钟\n总时长: ${total}分钟`;
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
      name: '',
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
            const text = duration >= 60 ? `${hours}h${minutes}m` : `${minutes}m`;
            return activeDaysCount.value > 1 ? `日 ${text}` : text;
          },
          fontSize: 10
        },
        itemStyle: {
          borderRadius: [6, 6, 0, 0]
        }
      }
    ]
  };

  renderEcharts(options as any);
};

watch([barChartData, () => props.selectedDate], () => {
  renderBarChart();
}, { immediate: true });

onMounted(() => {
  renderBarChart();
});
</script>

<template>
  <Card class="bar-chart-card">
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
