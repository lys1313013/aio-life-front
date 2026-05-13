<script setup lang="ts">
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
  statMode: 'day' | 'month' | 'week';
  selectedFilterCategoryIds?: null | string[];
}

const props = defineProps<Props>();
const chartRef = ref();
const { renderEcharts } = useEcharts(chartRef);

// 生成X轴数据和统计数据
const chartData = computed(() => {
  const xAxisData: string[] = [];
  const seriesData: Record<string, number[]> = {};

  // 过滤分类列表，如果设置了过滤，只保留对应的分类
  const filteredCategories =
    props.selectedFilterCategoryIds &&
    props.selectedFilterCategoryIds.length > 0
      ? props.categories.filter((c) =>
          props.selectedFilterCategoryIds?.includes(c.id),
        )
      : props.categories;

  // 初始化系列数据容器
  filteredCategories.forEach((cat) => {
    seriesData[cat.id] = [];
  });

  if (props.statMode === 'day') {
    // 按小时统计 (0-23)
    for (let i = 0; i < 24; i++) {
      xAxisData.push(`${i}:00`);
    }

    // 初始化24小时的数据
    filteredCategories.forEach((cat) => {
      seriesData[cat.id] = Array.from({ length: 24 }).fill(0);
    });

    // 填充数据
    props.timeSlots.forEach((slot) => {
      // 检查分类过滤
      if (
        props.selectedFilterCategoryIds &&
        props.selectedFilterCategoryIds.length > 0 &&
        !props.selectedFilterCategoryIds.includes(slot.categoryId)
      ) {
        return;
      }

      const startHour = Math.floor(slot.startTime / 60);
      const endHour = Math.floor(slot.endTime / 60);

      // 精确分割：如果跨越小时，分配给对应的小时
      for (let h = startHour; h <= endHour; h++) {
        const hourStart = h * 60;
        const hourEnd = (h + 1) * 60;

        const overlapStart = Math.max(hourStart, slot.startTime);
        const overlapEnd = Math.min(hourEnd, slot.endTime);

        if (overlapEnd > overlapStart) {
          const duration = overlapEnd - overlapStart;
          const arr = seriesData[slot.categoryId];
          if (arr && arr[h] !== undefined) {
            arr[h] = (arr[h] || 0) + duration;
          }
        }
      }
    });
  } else {
    // 按天统计 (周或月)
    let startDate: dayjs.Dayjs;
    let daysCount: number;

    if (props.statMode === 'week') {
      startDate = props.selectedDate.startOf('isoWeek');
      daysCount = 7;
    } else {
      // month
      startDate = props.selectedDate.startOf('month');
      daysCount = props.selectedDate.daysInMonth();
    }

    const today = dayjs();

    // 生成日期序列
    for (let i = 0; i < daysCount; i++) {
      const date = startDate.add(i, 'day');

      // 如果日期在今天之后，则不展示（只展示到今天）
      if (date.isAfter(today, 'day')) {
        break;
      }

      const dateStr = date.format('YYYY-MM-DD');

      // X轴标签
      if (props.statMode === 'week') {
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        xAxisData.push(`${weekdays[date.day()]}`);
      } else {
        xAxisData.push(`${date.date()}`);
      }

      // 初始化当天数据
      filteredCategories.forEach((cat) => {
        const arr = seriesData[cat.id];
        if (arr && arr.length <= i) {
          arr.push(0);
        }
      });

      // 统计当天数据
      const daySlots = props.timeSlots.filter((slot) => {
        const matchesDate = slot.date === dateStr;
        const matchesCategory =
          !props.selectedFilterCategoryIds ||
          props.selectedFilterCategoryIds.length === 0 ||
          props.selectedFilterCategoryIds.includes(slot.categoryId);
        return matchesDate && matchesCategory;
      });

      daySlots.forEach((slot) => {
        const duration = slot.endTime - slot.startTime + 1;
        const arr = seriesData[slot.categoryId];
        if (arr && arr[i] !== undefined) {
          arr[i] = (arr[i] || 0) + duration;
        }
      });
    }
  }

  return {
    xAxisData,
    seriesData,
    filteredCategories,
  };
});

const renderChart = () => {
  if (!chartRef.value) return;

  const { xAxisData, seriesData, filteredCategories } = chartData.value;

  const series = filteredCategories
    .map((category) => {
      return {
        name: getCategoryName(category.id, props.categories),
        type: 'line',
        stack: 'Total',
        areaStyle: {},
        emphasis: {
          focus: 'series',
        },
        data: seriesData[category.id] || [],
        itemStyle: {
          color: getCategoryColor(category.id, props.categories),
        },
        showSymbol: false,
        smooth: false,
      };
    })
    .filter((s) => {
      const hasData = s.data && s.data.some((val: number) => val > 0);
      return hasData;
    });

  const options = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
      formatter: (params: any) => {
        let result = `${params[0].axisValueLabel}<br/>`;
        params.forEach((param: any) => {
          if (param.value > 0) {
            const duration = param.value;
            const hours = Math.floor(duration / 60);
            const minutes = Math.floor(duration % 60); // 取整
            const timeStr = hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;

            result += `${param.marker} ${param.seriesName}: ${timeStr}<br/>`;
          }
        });
        return result;
      },
    },
    legend: {
      type: 'scroll',
      top: 0,
    },
    grid: {
      left: '20px',
      right: '20px',
      top: '40px',
      bottom: '10px',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '时长(分)',
        // 如果没有选择特定分类，且不是日模式，固定为 1440 分钟（24小时）以展示全天占比
        // 如果选择了特定分类，则让 ECharts 自动计算最大值，以便更清晰地观察趋势
        max:
          props.statMode !== 'day' &&
          (!props.selectedFilterCategoryIds ||
            props.selectedFilterCategoryIds.length === 0)
            ? 1440
            : undefined,
      },
    ],
    series,
  };

  renderEcharts(options as any);
};

watch(
  [
    () => props.timeSlots,
    () => props.statMode,
    () => props.selectedDate,
    () => props.selectedFilterCategoryIds,
  ],
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
  <Card
    class="chart-card overflow-hidden shadow-sm"
    :body-style="{ padding: '12px' }"
  >
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
  height: 280px;
}

.shadow-sm {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
}
</style>
