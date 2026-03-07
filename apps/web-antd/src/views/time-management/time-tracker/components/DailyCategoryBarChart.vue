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
  selectedFilterCategoryIds: null | string[];
}

const props = defineProps<Props>();

const chartRef = ref();
const { renderEcharts } = useEcharts(chartRef);

const selectedFilterCategories = computed(() => {
  if (!props.selectedFilterCategoryIds || props.selectedFilterCategoryIds.length === 0) return [];
  return props.categories.filter((cat) => props.selectedFilterCategoryIds?.includes(cat.id));
});

// 按天统计分类时长
const dailyCategoryData = computed(() => {
  const days: string[] = [];
  const seriesData: Record<string, number[]> = {};

  // 过滤分类列表
  const filteredCategories = (props.selectedFilterCategoryIds && props.selectedFilterCategoryIds.length > 0)
    ? props.categories.filter(c => props.selectedFilterCategoryIds?.includes(c.id))
    : props.categories;

  // 初始化系列数据
  filteredCategories.forEach(cat => {
    seriesData[cat.id] = [];
  });

  // 根据统计模式确定日期范围
  let startDate: dayjs.Dayjs;
  let daysCount: number;

  if (props.statMode === 'week') {
    startDate = props.selectedDate.startOf('isoWeek');
    daysCount = 7;
  } else {
    startDate = props.selectedDate.startOf('month');
    daysCount = props.selectedDate.daysInMonth();
  }

  for (let i = 0; i < daysCount; i++) {
    const date = startDate.add(i, 'day').format('YYYY-MM-DD');
    days.push(date);
    
    // 初始化当天的每个分类数据
    filteredCategories.forEach(cat => {
      if (!seriesData[cat.id]) {
        seriesData[cat.id] = [];
      }
      const arr = seriesData[cat.id];
      if (arr) {
        arr.push(0);
      }
    });

    // 统计当天每个分类的时长
    props.timeSlots.forEach((slot) => {
      if (slot.date !== date) return;
      
      const arr = seriesData[slot.categoryId];
      if (arr && arr[i] !== undefined) {
        arr[i] += (slot.endTime - slot.startTime + 1);
      }
    });
  }

  return {
    days,
    seriesData,
    filteredCategories
  };
});

const renderChart = () => {
  if (!chartRef.value) return;

  const { days, seriesData, filteredCategories } = dailyCategoryData.value;

  // 格式化日期显示 - 只显示日期数字
  const formattedDays = days.map((date) => {
    const day = dayjs(date);
    return props.statMode === 'week'
      ? `${day.date()}(${['日', '一', '二', '三', '四', '五', '六'][day.day()]})`
      : day.date().toString();
  });

  const series = filteredCategories.map(cat => ({
    name: cat.name,
    type: 'bar',
    stack: 'total',
    data: seriesData[cat.id],
    itemStyle: { color: cat.color },
    label: {
      show: true,
      position: 'inside',
      formatter: (params: any) => {
        const duration = params.value as number;
        if (duration < 30) return ''; // 太短的不显示文字
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        if (hours > 0) {
          return `${hours}h${minutes}m`;
        }
        return `${minutes}m`;
      },
      fontSize: 9,
    }
  })).filter(s => s.data && s.data.some(v => v > 0));

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!params.length) return '';
        const date = days[params[0].dataIndex];
        let res = `${dayjs(date).format('YYYY年MM月DD日')}<br/>`;
        let total = 0;
        params.forEach((p: any) => {
          if (p.value > 0) {
            const hours = Math.floor(p.value / 60);
            const minutes = p.value % 60;
            res += `${p.marker} ${p.seriesName}: ${hours}小时${minutes}分钟<br/>`;
            total += p.value;
          }
        });
        if (params.length > 1) {
          const tHours = Math.floor(total / 60);
          const tMinutes = total % 60;
          res += `<strong>总计: ${tHours}小时${tMinutes}分钟</strong>`;
        }
        return res;
      },
    },
    legend: {
      type: 'scroll',
      top: 0
    },
    grid: {
      left: 40,
      right: 20,
      top: 40,
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
    series: series,
  };

  renderEcharts(options as any);
};

watch(
  [dailyCategoryData, () => props.selectedFilterCategoryIds],
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
  <div class="daily-bar-chart-container">
    <EchartsUI ref="chartRef" />
  </div>
</template>

<style scoped>
.daily-bar-chart-container {
  height: 100%;
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
