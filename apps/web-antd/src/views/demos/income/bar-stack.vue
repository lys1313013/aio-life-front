<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { statistics } from '#/api/core/income';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

interface IncomeDetail {
  incTypeName: string; // 收入类型名称
  incAmt: number; // 收入金额
}

interface IncomeData {
  year: number; // 年份
  detail: IncomeDetail[]; // 该年份下的收入详情列表
}

let incData: IncomeData[] = [];

// 从incData中解析数据
const getYears = () => {
  return incData.map((item) => item.year);
};

const getIncomeTypes = () => {
  // 获取所有唯一的收入类型
  const types = new Set<string>();
  incData.forEach((item) => {
    item.detail.forEach((detail) => {
      types.add(detail.incTypeName);
    });
  });
  return [...types];
};

// 计算每年的总收入
const getTotalIncome = () => {
  return incData.map((item) => {
    const total = item.detail.reduce(
      (total, current) => total + current.incAmt,
      0,
    );
    return total.toFixed(2);
  });
};

const getSeriesData = () => {
  const incomeTypes = getIncomeTypes();
  const years = getYears().map((year) => year);

  const series = incomeTypes.map((type) => {
    const data = years.map((year) => {
      const yearData = incData.find((item) => item.year === year);
      if (yearData) {
        const detail = yearData.detail.find((d) => d.incTypeName == type);
        return detail ? detail.incAmt : null;
      }
      return 0;
    });

    return {
      name: type,
      type: 'bar',
      stack: 'income',
      barWidth: 10,
      barGap: '0%', // 柱子之间的间距
      emphasis: {
        focus: 'series',
      },
      label: {
        show: true,
        position: 'right',
        formatter: (params) => {
          // 计算百分比
          const yearIndex = params.dataIndex;
          const total = getTotalIncome()[yearIndex];
          const value = params.value || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return `${percentage}%`;
        }
      },
      data,
    };
  });

  // 添加总收入在最前面
  series.unshift({
    name: '总收入',
    type: 'bar',
    label: {
      show: true,
      position: 'top', // 字显示在上方
    },
    emphasis: {
      focus: 'series',
    },
    data: getTotalIncome(),
  });

  return series;
};

onMounted(
  async () => {
  try {
    const res = await statistics({});
    incData = res;
  } catch (error) {
    console.error('获取收入统计数据失败:', error);
  }

  renderEcharts({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算该年份的总收入
        params.forEach((item) => {
          if (item.seriesName !== '总收入') {
            total += item.value || 0;
          }
        });

        // 显示各项的金额和百分比
        params.forEach((item) => {
          if (item.seriesName !== '总收入' && item.value > 0) {
            const percentage =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${item.value} (${percentage}%)<br/>`;
          }
        });

        tooltip += `总计: ${total.toFixed(2)}`;
        return tooltip;
      },
    },
    legend: {},
    xAxis: [
      {
        type: 'category',
        data: getYears(),
        // 移除柱子之间的间距
        axisTick: {
          alignWithLabel: true,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
    ],
    series: getSeriesData(),
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" />
</template>

<style scoped></style>
