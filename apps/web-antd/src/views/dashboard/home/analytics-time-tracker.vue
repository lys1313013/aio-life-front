<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

import { query } from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const [categoriesRes, recordsRes] = await Promise.all([
      listCategories(),
      query({ condition: { date: today } }),
    ]);

    const categories = categoriesRes || [];
    const records = recordsRes.items || [];

    const categoryDurations: Record<string, number> = {};
    records.forEach((slot) => {
      const duration = slot.endTime - slot.startTime + 1;
      categoryDurations[slot.categoryId] =
        (categoryDurations[slot.categoryId] || 0) + duration;
    });

    const pieData = categories
      .map((category) => {
        const duration = categoryDurations[category.id || ''] || 0;
        return {
          name: category.name,
          value: duration,
          itemStyle: {
            color: category.color,
          },
        };
      })
      .filter((item) => item.value > 0);

    renderEcharts({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const duration = params.value;
          const hours = Math.floor(duration / 60);
          const minutes = duration % 60;
          const percentage = params.percent;
          return `${params.name}<br/>${hours}小时${minutes}分钟 (${percentage}%)<br/>总时长: ${duration}分钟`;
        },
      },
      legend: {
        bottom: '2%',
        left: 'center',
      },
      series: [
        {
          animationDelay() {
            return Math.random() * 100;
          },
          animationEasing: 'exponentialInOut',
          animationType: 'scale',
          avoidLabelOverlap: true,
          padAngle: 2,
          data:
            pieData.length > 0
              ? pieData
              : [
                  {
                    name: '今日暂无记录',
                    value: 0,
                    itemStyle: { color: '#ccc' },
                    label: { show: false },
                    labelLine: { show: false },
                  },
                ],
          emphasis: {
            label: {
              fontSize: '14',
              fontWeight: 'bold',
              show: true,
            },
          },
          itemStyle: {
            borderRadius: 8,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: (params: any) => {
              const duration = params.value;
              const hours = Math.floor(duration / 60);
              const minutes = duration % 60;
              if (hours > 0 && minutes > 0) {
                return `${params.name}\n${hours}小时${minutes}分钟`;
              } else if (hours > 0) {
                return `${params.name}\n${hours}小时`;
              } else {
                return `${params.name}\n${minutes}分钟`;
              }
            },
            fontSize: 10,
          },
          labelLine: {
            show: true,
            length: 3,
            length2: 6,
          },
          name: '时间分类',
          radius: ['45%', '70%'],
          center: ['50%', '40%'],
          type: 'pie',
        },
      ],
    });
  } catch (error) {
    console.error('Failed to load time tracker data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

defineExpose({
  loadData,
});
</script>

<template>
  <div v-loading="loading" class="h-full min-h-[300px] w-full sm:min-h-[240px]">
    <EchartsUI ref="chartRef" />
  </div>
</template>
