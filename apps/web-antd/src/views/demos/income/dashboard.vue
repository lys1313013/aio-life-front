<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { Card, Select } from 'ant-design-vue';

import { statisticsByYear } from '#/api/core/income';

const chartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const yearPieChartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { renderEcharts: renderPieEcharts } = useEcharts(pieChartRef);
const { renderEcharts: renderYearPieEcharts } = useEcharts(yearPieChartRef);

interface IncomeDetail {
  typeName: string; // 收入类型名称
  amt: number; // 收入金额
}

interface IncomeData {
  year: number; // 年份
  detail: IncomeDetail[]; // 该年份下的收入详情列表
}

let incData: IncomeData[] = [];

// 计算总收入
const totalAmount = ref(0);

// 选中的年份
const selectedYear = ref<number | 'all'>('all');

// 年份选项
const yearOptions = ref([{ value: 'all', label: '全部' }]);

// 格式化金额显示
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

// 根据选中的年份过滤数据
const filteredData = computed(() => {
  if (selectedYear.value === 'all') {
    return incData;
  }
  return incData.filter((item) => item.year === selectedYear.value);
});

// 从incData中解析数据
const getYears = () => {
  return filteredData.value.map((item) => item.year);
};

const getIncomeTypes = () => {
  // 获取所有唯一的收入类型
  const types = new Set<string>();
  filteredData.value.forEach((item) => {
    item.detail.forEach((detail) => {
      types.add(detail.typeName);
    });
  });
  return [...types];
};

// 计算每年的总收入
const getTotalIncome = () => {
  return filteredData.value.map((item) => {
    const total = item.detail.reduce(
      (total, current) => total + current.amt,
      0,
    );
    return total.toFixed(2);
  });
};

// 获取所有收入类型的总额（用于环形图）
const getIncomeTypeTotals = () => {
  const typeTotals: Record<string, number> = {};

  filteredData.value.forEach((item) => {
    item.detail.forEach((detail) => {
      if (!typeTotals[detail.typeName]) {
        typeTotals[detail.typeName] = 0;
      }
      typeTotals[detail.typeName] += detail.amt;
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
    total: Number(total.toFixed(2)),
  };
};

// 获取按年份汇总的饼图数据
const getYearPieChartData = () => {
  const yearTotals: Record<string, number> = {};

  filteredData.value.forEach((item) => {
    const yearTotal = item.detail.reduce((total, current) => total + current.amt, 0);
    yearTotals[item.year] = (yearTotals[item.year] || 0) + yearTotal;
  });

  const data = Object.entries(yearTotals)
    .map(([year, value]) => ({
      name: `${year}年`,
      value: Number(value.toFixed(2))
    }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    data,
    total: Number(total.toFixed(2)),
  };
};

const getSeriesData = () => {
  const incomeTypes = getIncomeTypes();
  const years = getYears().map((year) => year);

  const series = incomeTypes.map((type) => {
    const data = years.map((year) => {
      const yearData = filteredData.value.find((item) => item.year === year);
      if (yearData) {
        const detail = yearData.detail.find((d) => d.typeName == type);
        return detail ? detail.amt : null;
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

// 更新图表
const updateCharts = () => {
  const pieData = getPieChartData();
  const yearPieData = getYearPieChartData();
  totalAmount.value = pieData.total;

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

  // 渲染收入类型环形图
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
        radius: ['0%', '80%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
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

  // 渲染按时间分布饼图
  renderYearPieEcharts({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 10,
      top: 'center'
    },
    series: [
      {
        name: '年份收入分布',
        type: 'pie',
        radius: '80%',
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
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
          show: true
        },
        data: yearPieData.data
      }
    ]
  });
};

onMounted(
  async () => {
  try {
    const res = await statisticsByYear({});
    incData = res;

    // 根据incData生成年份选项
    const years = [...new Set(incData.map((item) => item.year))].sort(
      (a, b) => b - a,
    );
    yearOptions.value = [
      { value: 'all', label: '全部' },
      ...years.map(year => ({ value: year, label: year }))
    ];

    // 设置默认选中为全部年份
    selectedYear.value = 'all';

    updateCharts();
  } catch (error) {
    console.error('获取收入统计数据失败:', error);
  }
});

// 监听年份选择变化
watch(selectedYear, () => {
  updateCharts();
});
</script>

<template>
  <div class="page-container">
    <!-- 年份选择器 -->
    <Card class="year-selector-card">
      <div class="year-selector-content">
        <span class="year-label">选择年份：</span>
        <Select
          v-model:value="selectedYear"
          :options="yearOptions"
          style="width: 200px"
          placeholder="请选择年份"
        />
      </div>
    </Card>

    <!-- 总金额卡片 -->
    <div class="total-card">
      <div class="total-content">
        <div class="total-icon">💰</div>
        <div class="total-info">
          <div class="total-label">总收入</div>
          <div class="total-amount">{{ formatCurrency(totalAmount) }}</div>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-item">
        <h3>收入趋势</h3>
        <EchartsUI ref="chartRef" />
      </div>
      <div class="chart-item">
        <h3>收入类型分布</h3>
        <EchartsUI ref="pieChartRef" />
      </div>
      <div class="chart-item">
        <h3>收入时间分布</h3>
        <EchartsUI ref="yearPieChartRef" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
}

.year-selector-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.year-selector-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.year-label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.total-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  color: white;
}

.total-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.total-icon {
  font-size: 48px;
  opacity: 0.9;
}

.total-info {
  flex: 1;
}

.total-label {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.total-amount {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  height: 600px;
}

.chart-item {
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

@media (max-width: 1400px) {
  .chart-container {
    grid-template-columns: repeat(2, 1fr);
    height: auto;
  }

  .chart-item:nth-child(3) {
    grid-column: 1 / -1;
    height: 400px;
  }
}

@media (max-width: 1200px) {
  .chart-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .chart-item {
    height: 400px;
  }
}

@media (max-width: 768px) {
  .year-selector-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .year-selector-content :deep(.ant-select) {
    width: 100% !important;
  }

  .total-content {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .total-icon {
    font-size: 36px;
  }

  .total-amount {
    font-size: 24px;
  }
}
</style>
