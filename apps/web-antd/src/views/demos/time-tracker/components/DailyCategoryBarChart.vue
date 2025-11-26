<script setup lang="ts">
import type { TimeSlot, TimeSlotCategory } from '../types';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card } from 'ant-design-vue';
import dayjs from 'dayjs';

interface Props {
  timeSlots: TimeSlot[];
  categories: TimeSlotCategory[];
  selectedDate: dayjs.Dayjs;
  statMode: 'month' | 'week';
  selectedFilterCategoryId: null | string;
}

const props = defineProps<Props>();

const chartRef = ref();
const { renderEcharts } = useEcharts(chartRef);

const selectedFilterCategory = computed(() => {
  if (!props.selectedFilterCategoryId) return null;
  return (
    props.categories.find((cat) => cat.id === props.selectedFilterCategoryId) ||
    null
  );
});

const chartTitle = computed(() => {
  if (!props.selectedFilterCategoryId) return '每日分类统计';
  return `每日${selectedFilterCategory.value?.name}统计`;
});

// 按天统计分类时长
const dailyCategoryData = computed(() => {
  const days: string[] = [];
  const data: Record<string, number> = {};

  // 根据统计模式确定日期范围
  if (props.statMode === 'week') {
    const startOfWeek = props.selectedDate.startOf('isoWeek');
    for (let i = 0; i < 7; i++) {
      const date = startOfWeek.add(i, 'day').format('YYYY-MM-DD');
      days.push(date);
      data[date] = 0;
    }
  } else if (props.statMode === 'month') {
    const daysInMonth = props.selectedDate.daysInMonth();
    const startOfMonth = props.selectedDate.startOf('month');
    for (let i = 0; i < daysInMonth; i++) {
      const date = startOfMonth.add(i, 'day').format('YYYY-MM-DD');
      days.push(date);
      data[date] = 0;
    }
  }

  // 统计每个分类的时长
  props.timeSlots.forEach((slot) => {
    if (
      props.selectedFilterCategoryId &&
      slot.categoryId !== props.selectedFilterCategoryId
    ) {
      return;
    }

    if (data[slot.date] !== undefined) {
      data[slot.date] += slot.endTime - slot.startTime + 1;
    }
  });

  return {
    days,
    data: days.map((date) => data[date] || 0),
  };
});

const renderChart = () => {
  if (!chartRef.value) return;

  const { days, data } = dailyCategoryData.value;

  // 格式化日期显示 - 只显示日期数字
  const formattedDays = days.map((date) => {
    const day = dayjs(date);
    return props.statMode === 'week'
      ? `${day.date()}(${['日', '一', '二', '三', '四', '五', '六'][day.day()]})`
      : day.date().toString();
  });

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const param = Array.isArray(params) ? params[0] : params;
        const date = days[param.dataIndex];
        const duration = param.value as number;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;

        return `${dayjs(date).format('YYYY年MM月DD日')}<br/>
                ${param.seriesName}: ${hours}小时${minutes}分钟`;
      },
    },
    grid: {
      left: 40,
      right: 20,
      top: 60,
      bottom: props.statMode === 'month' ? 80 : 40,
    },
    xAxis: {
      type: 'category',
      data: formattedDays,
      axisLabel: {
        interval: 0,
        rotate: props.statMode === 'month' ? 45 : 0,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
      name: '分钟',
      splitLine: { show: true },
    },
    series: [
      {
        name:
          props.selectedFilterCategoryId && selectedFilterCategory.value
            ? selectedFilterCategory.value.name
            : '总时长',
        type: 'bar',
        data,
        itemStyle: {
          color:
            props.selectedFilterCategoryId && selectedFilterCategory.value
              ? selectedFilterCategory.value.color
              : '#1890ff',
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const duration = params.value as number;
            if (duration === 0) return '';
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            return hours > 0 ? `${hours}h` : `${minutes}m`;
          },
          fontSize: 10,
        },
      },
    ],
  };

  renderEcharts(options as any);
};

watch(
  [dailyCategoryData, props.selectedFilterCategoryId],
  () => {
    renderChart();
  },
  { immediate: true },
);

onMounted(() => {
  renderChart();
});
</script>

<template>
  <Card class="daily-bar-chart-card">
    <template #title>
      <div class="chart-header">
        <span>{{ chartTitle }}</span>
        <div v-if="selectedFilterCategory" class="filter-indicator">
          <div
            class="color-indicator"
            :style="{ backgroundColor: selectedFilterCategory.color }"
          ></div>
          <span>{{ selectedFilterCategory.name }}</span>
        </div>
      </div>
    </template>
    <div class="daily-bar-chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<style scoped>
.daily-bar-chart-card {
  min-width: 400px;
  flex: 2;
}

.daily-bar-chart-container {
  height: 300px;
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
