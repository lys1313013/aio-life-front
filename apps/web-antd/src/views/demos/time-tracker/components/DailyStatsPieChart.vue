<template>
  <Card class="pie-chart-card">
    <div class="pie-chart-container">
      <EchartsUI ref="chartRef" />
    </div>
  </Card>
</template>

<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';
import type { TimeSlot, TimeSlotCategory } from '../types';

import { computed, onMounted, ref, watch } from 'vue';
import { Card } from 'ant-design-vue';
import dayjs from 'dayjs';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

interface Props {
  timeSlots: TimeSlot[];
  categories: TimeSlotCategory[];
  selectedDate: dayjs.Dayjs;
  statMode: 'month' | 'week';
  selectedFilterCategoryId: null | string;
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

const selectedFilterCategory = computed(() => {
  if (!props.selectedFilterCategoryId) return null;
  return (
    props.categories.find((cat) => cat.id === props.selectedFilterCategoryId) ||
    null
  );
});

// 按天统计时长
const dailyStatsData = computed(() => {
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

  // 统计每天的时长
  props.timeSlots.forEach((slot) => {
    if (
      props.selectedFilterCategoryId &&
      slot.categoryId !== props.selectedFilterCategoryId
    ) {
      return;
    }

    if (data[slot.date] !== undefined) {
      data[slot.date] = (data[slot.date] || 0) + (slot.endTime - slot.startTime + 1);
    }
  });

  // 转换为饼图数据格式
  return days.map(date => {
    const duration = data[date] || 0;
    const day = dayjs(date);
    const name = props.statMode === 'week'
      ? `${['日', '一', '二', '三', '四', '五', '六'][day.day()] || ''}`
      : `${day.date()}`;

    return {
      name,
      value: duration,
      date // 保存原始日期用于tooltip
    };
  }).filter(item => item.value > 0); // 只显示有数据的天
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
        const date = params.data.date;

        return `${dayjs(date).format('YYYY-MM-DD')} (${params.name})<br/>
                ${hours}小时${minutes}分钟 (${percentage}%)<br/>
                总时长: ${duration}分钟`;
      }
    },
    legend: {
      type: 'scroll' as const,
      orient: 'vertical' as const,
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '每日时长',
        type: 'pie',
        radius: ['30%', '80%'],
        center: ['40%', '50%'], // 向左偏移一点给图例留空间
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            const duration = params.value;
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const percentage = params.percent;

            if (duration >= 60) {
              return `${params.name}\n${hours}h${minutes}m`;
            } else {
              return `${params.name}\n${minutes}m`;
            }
          },
          fontSize: 10
        },
        data: dailyStatsData.value
      }
    ]
  };

  renderEcharts(options as any);
};

watch(
  [dailyStatsData, () => props.selectedFilterCategoryId],
  () => {
    renderPieChart();
  },
  { immediate: true },
);

onMounted(() => {
  renderPieChart();
});
</script>

<style scoped>

.pie-chart-container {
  height: 300px;
  width: 100%;
}
</style>
