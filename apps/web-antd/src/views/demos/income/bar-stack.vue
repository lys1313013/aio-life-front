<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {},
    xAxis: [
      {
        type: 'category',
        data: ['2021年', '2022年', '2023年', '2024年', '2025年'],
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
    ],
    series: [
      {
        name: '公积金',
        type: 'bar',
        stack: 'Ad',
        label: {
          show: true, // 开启标签显示
        },
        emphasis: {
          focus: 'series',
        },
        data: [120, 132, 101, 134, 90],
      },
      {
        name: '工资',
        type: 'bar',
        stack: 'Ad',
        emphasis: {
          focus: 'series',
        },
        data: [220, 182, 191, 234, 290],
        label: {
          show: true, // 开启标签显示
        },
      },
      {
        name: '理财',
        type: 'bar',
        stack: 'Ad',
        emphasis: {
          focus: 'series',
        },
        data: [150, 232, 201, 154, 190],
        label: {
          show: true,
        },
      },
    ],
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>

<style scoped></style>
