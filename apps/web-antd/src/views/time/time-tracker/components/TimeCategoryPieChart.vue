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

// 计算每个分类的总时长
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
    durations[slot.categoryId] =
      durations[slot.categoryId] === undefined
        ? duration
        : (durations[slot.categoryId] || 0) + duration;
  });

  return durations;
});

// 生成饼图数据
const pieChartData = computed(() => {
  const data = props.categories
    .map((category) => {
      const duration = categoryDurations.value[category.id] || 0;
      return {
        name: getCategoryName(category.id, props.categories),
        value: duration,
        itemStyle: {
          color: getCategoryColor(category.id, props.categories),
        },
      };
    })
    .filter((item) => item.value > 0); // 只显示有数据的分类

  return data;
});

// 渲染饼图
const renderPieChart = () => {
  if (!chartRef.value) return;

  const options = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: any) => {
        const duration = params.value;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const percentage = params.percent;

        return `${params.name}<br/>
                ${hours}小时${minutes}分钟 (${percentage}%)<br/>
                总时长: ${duration}分钟`;
      },
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: '时间分类',
        type: 'pie' as const,
        radius: ['35%', '60%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 0,
          borderColor: 'transparent',
          borderWidth: 0,
        },
        label: {
          show: true,
          position: 'outside' as const,
          formatter: (params: any) => {
            const percentage = params.percent;
            return `${params.name}\n${percentage}%`;
          },
          fontSize: 10,
          fontWeight: 'normal' as const,
          color: '#666',
          minMargin: 5,
          overflow: 'truncate' as const,
          width: 60,
        },
        labelLine: {
          show: true,
          length: 5,
          length2: 8,
          smooth: true,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold' as const,
          },
        },
        data: pieChartData.value,
      },
    ],
  };

  renderEcharts(options as any);
};

// 监听数据变化，重新渲染图表
watch(
  [pieChartData, () => props.selectedDate],
  () => {
    renderPieChart();
  },
  { immediate: true },
);

onMounted(() => {
  renderPieChart();
});
</script>

<template>
  <Card
    class="pie-chart-card overflow-hidden shadow-sm"
    :body-style="{ padding: '12px' }"
  >
    <div class="pie-chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<style scoped>
.pie-chart-card {
  flex: 2;
  width: 100%;
  min-width: 300px;
  max-width: 500px;
}

.pie-chart-container {
  width: 100%;
  height: 300px;
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
