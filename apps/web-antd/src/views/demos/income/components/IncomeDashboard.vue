<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';
import { Card, Select } from 'ant-design-vue';

import { statisticsByYear, statisticsByMonth } from '#/api/core/income';

const chartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const yearPieChartRef = ref<EchartsUIType>();
const monthChartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);
const { renderEcharts: renderPieEcharts } = useEcharts(pieChartRef);
const { renderEcharts: renderYearPieEcharts } = useEcharts(yearPieChartRef);
const { renderEcharts: renderMonthEcharts } = useEcharts(monthChartRef);
const { isMobile } = usePreferences();

interface IncomeDetail {
  typeName: string; // 收入类型名称
  amt: number; // 收入金额
}

interface IncomeData {
  year: number; // 年份
  detail: IncomeDetail[]; // 该年份下的收入详情列表
}

interface MonthlyIncomeData {
  year: number; // 年份
  month: number; // 月份
  detail: IncomeDetail[]; // 该月份下的收入详情列表
}

const incData = ref<IncomeData[]>([]);
const monthlyIncData = ref<MonthlyIncomeData[]>([]);

// 计算总收入
const totalAmount = ref(0);

// 当年总收入
const currentYearAmount = ref(0);

// 选中的年份
const selectedYear = ref<number | 'all'>('all');

// 年份选项
const yearOptions = ref<{ value: string | number; label: string | number }[]>([{ value: 'all', label: '全部' }]);

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
    return incData.value;
  }
  return incData.value.filter((item) => item.year === selectedYear.value);
});

// 根据选中的年份过滤月份数据
const filteredMonthlyData = computed(() => {
  let data: MonthlyIncomeData[] = [];
  if (selectedYear.value === 'all') {
    data = monthlyIncData.value;
  } else {
    data = monthlyIncData.value.filter((item) => item.year === selectedYear.value);
  }
  // 按时间升序排序
  return [...data].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return a.month - b.month;
  });
});

// 获取月份数据的月份列表
const getMonths = () => {
  return filteredMonthlyData.value.map((item) => {
    const yearStr = item.year.toString().slice(-2);
    const monthStr = item.month.toString().padStart(2, '0');
    return `${yearStr}-${monthStr}`;
  });
};

// 计算每个月份的总收入
const getMonthlyTotalIncome = () => {
  return filteredMonthlyData.value.map((item) => {
    const total = item.detail.reduce(
      (total, current) => total + current.amt,
      0,
    );
    return Number(total.toFixed(2));
  });
};

// 获取月份柱状图的系列数据
const getMonthlySeriesData = () => {
  const incomeTypes = getIncomeTypes();

  const series: any[] = incomeTypes.map((type) => {
    const data = filteredMonthlyData.value.map((item) => {
      const detail = item.detail.find((d) => d.typeName == type);
      return detail ? detail.amt : 0;
    });

    return {
      name: type,
      type: 'line',
      stack: 'income',
      areaStyle: {},
      emphasis: {
        focus: 'series',
      },
      label: {
        show: false,
        position: 'right',
        formatter: (params: any) => {
          // 计算百分比
          const monthIndex = params.dataIndex;
          const total = getMonthlyTotalIncome()[monthIndex] || 0;
          const value = params.value || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return `${percentage}%`;
        }
      },
      data,
    };
  });

  // 添加总收入在最前面
  // series.unshift({
  //   name: '总收入',
  //   type: 'bar',
  //   barWidth: 40,
  //   label: {
  //     show: false,
  //     position: 'top', // 字显示在上方
  //     formatter: () => '',
  //   },
  //   emphasis: {
  //     focus: 'series',
  //   },
  //   data: getMonthlyTotalIncome(),
  // });

  return series;
};

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
    return Number(total.toFixed(2));
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
      typeTotals[detail.typeName]! += detail.amt;
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

  const series: any[] = incomeTypes.map((type) => {
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
      barWidth: 15, // 限制柱子宽度
      barMaxWidth: 30,
      barGap: '0%', // 柱子之间的间距
      emphasis: {
        focus: 'series',
      },
      label: {
        show: false,
        position: 'right',
        formatter: (params: any) => {
          // 计算百分比
          const yearIndex = params.dataIndex;
          const total = getTotalIncome()[yearIndex] || 0;
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
    barWidth: 30,
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

  // 计算当年总收入
  const currentYear = new Date().getFullYear();
  const currentYearData = incData.value.find(item => item.year === currentYear);
  if (currentYearData) {
    currentYearAmount.value = currentYearData.detail.reduce((sum, item) => sum + item.amt, 0);
  } else {
    currentYearAmount.value = 0;
  }

  // 渲染柱状图
  renderEcharts({
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算该年份的总收入
        params.forEach((item: any) => {
          if (item.seriesName !== '总收入') {
            total += item.value || 0;
          }
        });

        // 显示各项的金额和百分比
        params.forEach((item: any) => {
          if (item.seriesName !== '总收入' && item.value > 0) {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${item.value} (${percentage}%)<br/>`;
          }
        });

        tooltip += `总计: ${total.toFixed(2)}`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
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
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center'
    },
    series: [
      {
        name: '收入类型分布',
        type: 'pie',
        radius: ['0%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            return `${params.name}\n${params.percent}%`;
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
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center'
    },
    series: [
      {
        name: '年份收入分布',
        type: 'pie',
        radius: '60%',
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: (params: any) => {
            return `${params.name}\n${params.percent}%`;
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

  // 渲染月份柱状图
  renderMonthEcharts({
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算该月份的总收入
        params.forEach((item: any) => {
            total += item.value || 0;
        });

        // 显示各项的金额和百分比
        params.forEach((item: any) => {
          if (item.value > 0) {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${item.value} (${percentage}%)<br/>`;
          }
        });

        tooltip += `总计: ${total.toFixed(2)}`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    xAxis: [
      {
        type: 'category',
        data: getMonths(),
        // 移除柱子之间的间距
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          rotate: 45,
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
      },
    ],
    series: getMonthlySeriesData(),
  });
};

// 刷新数据
const refreshData = async () => {
  try {
    // 保存当前选中的年份
    const currentYear = selectedYear.value;

    const [yearRes, monthRes] = await Promise.all([
      statisticsByYear({}),
      statisticsByMonth({})
    ]);
    incData.value = yearRes;
    monthlyIncData.value = monthRes;

    // 根据incData生成年份选项
    const years = [...new Set(incData.value.map((item) => item.year))].sort(
      (a, b) => b - a,
    );
    yearOptions.value = [
      { value: 'all', label: '全部' },
      ...years.map(year => ({ value: year, label: year }))
    ];

    // 恢复之前选中的年份，如果该年份不再存在则设为全部
    const yearExists = yearOptions.value.some(option => option.value === currentYear);
    selectedYear.value = yearExists ? currentYear : 'all';

    updateCharts();
  } catch (error) {
    console.error('获取收入统计数据失败:', error);
  }
};

onMounted(async () => {
  await refreshData();
});

// 定义年份变化事件
const emit = defineEmits<{
  (e: 'yearChange', year: number | 'all'): void
}>();

// 监听年份选择变化
watch([selectedYear, isMobile], (newVal) => {
  updateCharts();
  // 触发年份变化事件
  emit('yearChange', newVal[0]);
});

// 暴露刷新方法给父组件
defineExpose({
  refreshData
});
</script>

<template>
  <div class="income-dashboard">
    <!-- 总金额卡片（包含年份选择） -->
    <div class="total-card">
      <div class="dashboard-header">
        <div class="total-stats">
          <div class="stat-item">
            <div class="stat-label">总收入</div>
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">{{ new Date().getFullYear() }}年总收入</div>
            <div class="stat-value">{{ formatCurrency(currentYearAmount) }}</div>
          </div>
        </div>

        <div class="year-selector-wrapper">
          <span class="year-label">选择年份：</span>
          <Select
            v-model:value="selectedYear"
            :options="yearOptions"
            placeholder="请选择年份"
            class="custom-select year-select"
          />
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-item">
        <h3>年收入趋势</h3>
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
      <div class="chart-item">
        <h3>月收入趋势</h3>
        <EchartsUI ref="monthChartRef" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.income-dashboard {
  padding: 12px;
}

.dashboard-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
}

.year-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
}

.year-select {
  width: 160px;
}

.year-label {
  font-weight: 500;
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
}

.total-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.25);
  color: white;
  transition: all 0.3s ease;
}

.total-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.35);
}

.total-stats {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 24px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 0.3px;
  color: #fff;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.2;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: #fff; /* Fallback */
}

.stat-divider {
  width: 1px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.5px;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto auto;
  gap: 12px;
  height: auto;
}

.chart-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 400px;
  overflow: hidden; /* 防止内容溢出 */
}

/* 月份收入图单独占据一行 */
.chart-item:nth-child(4) {
  grid-column: 1 / -1;
  height: 320px;
}

.chart-item h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex-shrink: 0;
}

.chart-item :deep(.echarts-ui),
.chart-item > div:not(h3) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 1400px) {
  .chart-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-item:nth-child(4) {
    grid-column: auto;
  }
}

@media (max-width: 1200px) {
  .chart-container {
    grid-template-columns: 1fr;
  }

  .chart-item:nth-child(4) {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .income-dashboard {
    padding: 8px;
  }

  .dashboard-header {
    flex-direction: column-reverse;
    gap: 16px;
  }

  .total-stats {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .stat-divider {
    width: 100%;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }

  .year-selector-wrapper {
    width: 100%;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }

  .year-select {
    width: 100% !important;
  }

  .chart-item {
    height: 320px;
    padding: 8px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 13px;
  }
}
</style>
