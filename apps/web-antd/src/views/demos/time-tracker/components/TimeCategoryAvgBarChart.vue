<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { TimeSlot, TimeSlotCategory } from '../types';
import { computed, onMounted, ref, watch } from 'vue';
import { Card } from 'ant-design-vue';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface Props {
  timeSlots: TimeSlot[];
  categories: TimeSlotCategory[];
  periodDayCount: number;
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const categoryTotalDurations = computed(() => {
  const durations: Record<string, number> = {};
  props.timeSlots.forEach(slot => {
    const duration = slot.endTime - slot.startTime + 1;
    durations[slot.categoryId] = (durations[slot.categoryId] || 0) + duration;
  });
  return durations;
});

const categoryActiveDayCounts = computed(() => {
  const daySets: Record<string, Set<string>> = {};
  props.timeSlots.forEach(slot => {
    const set = (daySets[slot.categoryId] ||= new Set<string>());
    if (slot.date) set.add(slot.date);
  });
  const counts: Record<string, number> = {};
  Object.keys(daySets).forEach(cid => {
    counts[cid] = daySets[cid].size;
  });
  return counts;
});

const avgBarChartData = computed(() => {
  const items = props.categories
    .map(category => {
      const total = categoryTotalDurations.value[category.id] || 0;
      const activeDays = categoryActiveDayCounts.value[category.id] || 0;
      const avg = activeDays > 0 ? Math.floor(total / activeDays) : 0;
      return {
        name: category.name,
        value: avg,
        itemStyle: { color: category.color }
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  return items;
});

const renderBarChart = () => {
  if (!chartRef.value) return;

  const names = avgBarChartData.value.map(i => i.name);
  const values = avgBarChartData.value.map(i => i.value);

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const duration = p.value;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return `${p.name}<br/>日均 ${hours}小时${minutes}分钟\n(${duration}分钟/天)`;
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
      name: '分钟/天',
      splitLine: { show: true }
    },
    series: [
      {
        type: 'bar',
        data: avgBarChartData.value,
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const duration = params.value;
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return duration >= 60 ? `${hours}h${minutes}m/天` : `${minutes}m/天`;
          },
          fontSize: 10
        },
        itemStyle: { borderRadius: [6, 6, 0, 0] }
      }
    ]
  };

  renderEcharts(options);
};

watch([avgBarChartData, () => props.periodDayCount], () => {
  renderBarChart();
}, { immediate: true });

onMounted(() => {
  renderBarChart();
});
</script>

<template>
  <Card title="按天平均柱状图" class="avg-bar-chart-card">
    <div class="avg-bar-chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
  </template>

<style scoped>
.avg-bar-chart-card {
  min-width: 400px;
  flex: 2;
}
.avg-bar-chart-container {
  height: 300px;
  width: 100%;
}
</style>
