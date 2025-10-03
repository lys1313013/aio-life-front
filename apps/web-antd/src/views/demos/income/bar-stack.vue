<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { statistics } from '#/api/core/income';

const chartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { renderEcharts: renderPieEcharts } = useEcharts(pieChartRef);

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

// 获取所有收入类型的总额（用于环形图）
const getIncomeTypeTotals = () => {
  const typeTotals: Record<string, number> = {};

  incData.forEach((item) => {
    item.detail.forEach((detail) => {
      if (!typeTotals[detail.incTypeName]) {
        typeTotals[detail.incTypeName] = 0;
      }
      typeTotals[detail.incTypeName] += detail.incAmt;
    });
  });

  return Object.entries(typeTotals).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));
};

// 获取环形图数据
const getPieChartData = () => {
  const data = getIncomeTypeTotals();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    data,
    total: Number(total.toFixed(2))
  };
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

  // 渲染柱状图
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

  // 渲染环形图
  const pieData = getPieChartData();
  renderPieEcharts({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        name: '收入类型分布',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params) => {
            return `${params.name}\n${params.value} (${params.percent}%)`;
          },
          fontSize: 12
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10
        },
        data: pieData.data
      }
    ]
  });
});
</script>

<template>
  <div class="chart-container">
    <div class="chart-item">
      <h3>收入趋势</h3>
      <EchartsUI ref="chartRef" />
    </div>
    <div class="chart-item">
      <h3>收入类型分布</h3>
      <EchartsUI ref="pieChartRef" />
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  display: flex;
  gap: 20px;
  padding: 20px;
  height: 600px;
}

.chart-item {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.chart-item h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.chart-item :deep(.echarts-ui) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 1200px) {
  .chart-container {
    flex-direction: column;
    height: auto;
  }

  .chart-item {
    height: 400px;
  }
}
</style>
