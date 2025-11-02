<template>
  <Card :title="`时间分类统计`" class="pie-chart-card">
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
}

const props = defineProps<Props>();

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

// 计算每个分类的总时长
const categoryDurations = computed(() => {
  const durations: Record<string, number> = {};

  props.timeSlots.forEach(slot => {
    const duration = slot.endTime - slot.startTime + 1;
    if (durations[slot.categoryId]) {
      durations[slot.categoryId] += duration;
    } else {
      durations[slot.categoryId] = duration;
    }
  });

  return durations;
});

// 生成饼图数据
const pieChartData = computed(() => {
  const data = props.categories.map(category => {
    const duration = categoryDurations.value[category.id] || 0;
    return {
      name: category.name,
      value: duration,
      itemStyle: {
        color: category.color
      }
    };
  }).filter(item => item.value > 0); // 只显示有数据的分类

  return data;
});

// 渲染饼图
const renderPieChart = () => {
  if (!chartRef.value) return;

  const options = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const duration = params.value;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const percentage = params.percent;

        return `${params.name}<br/>
                ${hours}小时${minutes}分钟 (${percentage}%)<br/>
                总时长: ${duration}分钟`;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 12
      }
    },
    series: [
      {
        name: '时间分类',
        type: 'pie',
        radius: ['30%', '80%'],
        center: ['50%', '50%'],
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
              // 如果时长超过1小时，显示小时和分钟
              return `${params.name}\n${hours}h${minutes}m (${percentage}%)`;
            } else {
              // 如果时长不足1小时，只显示分钟
              return `${params.name}\n${minutes}m (${percentage}%)`;
            }
          },
          fontSize: 10,
          fontWeight: 'normal',
          color: '#333',
          minMargin: 5,
          overflow: 'truncate',
          width: 80,
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10,
          smooth: true
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data: pieChartData.value
      }
    ]
  };

  renderEcharts(options);
};

// 监听数据变化，重新渲染图表
watch([pieChartData, props.selectedDate], () => {
  renderPieChart();
}, { immediate: true });

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
