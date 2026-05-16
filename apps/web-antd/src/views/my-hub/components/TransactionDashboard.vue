<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { Card, Select } from 'ant-design-vue';

import { statisticsByMonth as expenseStatMonth, statisticsByYear as expenseStatYear } from '#/api/core/expense';
import { statisticsByMonth as incomeStatMonth, statisticsByYear as incomeStatYear } from '#/api/core/income';

const props = defineProps({
  type: {
    type: String,
    default: 'income',
    validator: (val: string) => ['income', 'expense'].includes(val)
  }
});

// 定义事件
const emit = defineEmits<{
  (e: 'yearChange', year: 'all' | number): void;
  (e: 'monthSelect', payload: { monthStr: string, startDate: string, endDate: string }): void;
}>();

const chartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const yearPieChartRef = ref<EchartsUIType>();
const monthChartRef = ref<EchartsUIType>();

const { renderEcharts } = useEcharts(chartRef);
const { renderEcharts: renderPieEcharts } = useEcharts(pieChartRef);
const { renderEcharts: renderYearPieEcharts } = useEcharts(yearPieChartRef);
const { renderEcharts: renderMonthEcharts, getChartInstance: getMonthChartInstance } = useEcharts(monthChartRef);

const { isMobile } = usePreferences();

const isIncome = computed(() => props.type === 'income');
const labelName = computed(() => isIncome.value ? '收入' : '支出');

interface DetailData {
  typeName: string;
  amt: number;
}

interface YearData {
  year: number;
  detail: DetailData[];
}

interface MonthData {
  year: number;
  month: number;
  detail: DetailData[];
}

const yearDataList = ref<YearData[]>([]);
const monthDataList = ref<MonthData[]>([]);

// 计算总金额
const totalAmount = ref(0);

// 当年总金额
const currentYearAmount = ref(0);

// 选中的年份
const selectedYear = ref<'all' | number>('all');

// 年份选项
const yearOptions = ref<{ label: number | string; value: number | string }[]>([
  { value: 'all', label: '全部' },
]);

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
    return yearDataList.value;
  }
  return yearDataList.value.filter((item) => item.year === selectedYear.value);
});

// 根据选中的年份过滤月份数据
const filteredMonthlyData = computed(() => {
  let data: MonthData[] = [];
  data = selectedYear.value === 'all'
    ? monthDataList.value
    : monthDataList.value.filter((item) => item.year === selectedYear.value);
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
    const yearStr = item.year.toString().slice(-2); // 为了图表显示更紧凑，用两位年份
    const monthStr = item.month.toString().padStart(2, '0');
    return `${yearStr}-${monthStr}`;
  });
};

// 获取真实月份格式 (YYYY-MM) 用于点击事件
const getFullMonths = () => {
  return filteredMonthlyData.value.map((item) => {
    const yearStr = item.year.toString();
    const monthStr = item.month.toString().padStart(2, '0');
    return `${yearStr}-${monthStr}`;
  });
};

// 计算每个月份的总金额
const getMonthlyTotalAmount = () => {
  return filteredMonthlyData.value.map((item) => {
    const total = item.detail.reduce((sum, current) => sum + current.amt, 0);
    return Number(total.toFixed(2));
  });
};

// 获取月份柱状/面积图的系列数据
const getMonthlySeriesData = () => {
  const types = getTypes();

  const series: any[] = types.map((type) => {
    const data = filteredMonthlyData.value.map((item) => {
      const detail = item.detail.find((d) => d.typeName == type);
      return detail ? detail.amt : 0;
    });

    return {
      name: type,
      type: 'line',
      stack: 'amount',
      areaStyle: {},
      emphasis: { focus: 'series' },
      symbol: 'emptyCircle',
      symbolSize: 4,
      label: {
        show: false,
        position: 'right',
        formatter: (params: any) => {
          const monthIndex = params.dataIndex;
          const total = getMonthlyTotalAmount()[monthIndex] || 0;
          const value = params.value || 0;
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return `${percentage}%`;
        },
      },
      data,
    };
  });

  return series;
};

// 从数据中解析年份
const getYears = () => {
  return filteredData.value.map((item) => item.year);
};

const getTypes = () => {
  const types = new Set<string>();
  filteredData.value.forEach((item) => {
    item.detail.forEach((detail) => {
      types.add(detail.typeName);
    });
  });
  return [...types];
};

// 计算每年的总额
const getTotalAmountByYear = () => {
  return filteredData.value.map((item) => {
    const total = item.detail.reduce((sum, current) => sum + current.amt, 0);
    return Number(total.toFixed(2));
  });
};

// 获取所有类型的总额（用于环形图）
const getTypeTotals = () => {
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
    value: Number(value.toFixed(2)),
  }));
};

// 获取环形图数据
const getPieChartData = () => {
  const data = getTypeTotals();
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
    const yearTotal = item.detail.reduce((sum, current) => sum + current.amt, 0);
    yearTotals[item.year] = (yearTotals[item.year] || 0) + yearTotal;
  });

  const data = Object.entries(yearTotals)
    .map(([year, value]) => ({
      name: `${year}年`,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => Number.parseInt(a.name) - Number.parseInt(b.name));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    data,
    total: Number(total.toFixed(2)),
  };
};

const getSeriesData = () => {
  const types = getTypes();
  const years = getYears().map((year) => year);
  const yearlyTotals = getTotalAmountByYear();

  const series: any[] = [];

  // 添加类型系列（堆叠）
  types.forEach((type) => {
    const data = years.map((year) => {
      const yearData = filteredData.value.find((item) => item.year === year);
      if (yearData) {
        const detail = yearData.detail.find((d) => d.typeName == type);
        return detail ? detail.amt : null;
      }
      return 0;
    });

    series.push({
      name: type,
      type: 'bar',
      stack: 'amount',
      barWidth: 40,
      barMaxWidth: 60,
      barGap: '20%',
      emphasis: { focus: 'series' },
      label: { show: false },
      data,
    });
  });

  // 添加一个独立系列显示总数（不堆叠）
  series.push({
    name: '年度合计',
    type: 'bar',
    stack: '', // 不堆叠
    data: yearlyTotals,
    barWidth: 40,
    barMaxWidth: 60,
    barGap: '-100%', // 与堆叠柱子重合
    z: 10,
    label: {
      show: true,
      position: 'top',
      formatter: (params: any) => {
        return params.value > 0 ? formatCurrency(params.value) : '';
      },
      fontSize: 12,
      color: '#333',
      fontWeight: 'bold',
    },
    itemStyle: { color: 'rgba(0,0,0,0)' }, // 完全透明
    emphasis: { disabled: true },
  });

  return series;
};

// 更新图表
const updateCharts = () => {
  const pieData = getPieChartData();
  const yearPieData = getYearPieChartData();
  totalAmount.value = pieData.total;

  // 计算当年总金额
  const currentYear = new Date().getFullYear();
  const currentYearData = yearDataList.value.find((item) => item.year === currentYear);
  currentYearAmount.value = currentYearData
    ? currentYearData.detail.reduce((sum, item) => sum + item.amt, 0)
    : 0;

  // 渲染年度柱状图
  renderEcharts({
    grid: {
      left: '3%',
      right: '4%',
      bottom: isMobile.value ? '15%' : '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;
        params.forEach((item: any) => {
          if (item.seriesName !== '年度合计') total += item.value || 0;
        });
        params.forEach((item: any) => {
          if (item.seriesName !== '年度合计' && item.value > 0) {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${item.value} (${percentage}%)<br/>`;
          }
        });
        tooltip += `<div style="border-top:1px solid #eee;margin-top:5px;padding-top:5px;font-weight:bold;">
          年度合计: ${formatCurrency(total)}
        </div>`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      left: 'center',
      padding: isMobile.value ? [0, 0, 0, 0] : [5, 5, 5, 5],
      itemGap: isMobile.value ? 8 : 10,
      formatter: (name: string) => (name === '年度合计' ? '' : name),
    },
    xAxis: [
      {
        type: 'category',
        data: getYears(),
        axisTick: { alignWithLabel: true },
      },
    ],
    yAxis: [{ type: 'value' }],
    series: getSeriesData(),
  });

  // 渲染类型分布环形图
  renderPieEcharts({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      padding: isMobile.value ? [0, 0, 0, 0] : [5, 5, 5, 5],
      itemGap: isMobile.value ? 8 : 10,
    },
    series: [
      {
        name: `${labelName.value}类型分布`,
        type: 'pie',
        radius: isMobile.value ? ['0%', '45%'] : ['0%', '60%'],
        center: isMobile.value ? ['50%', '40%'] : ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 10, borderWidth: 2 },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => `${params.name}\n${formatCurrency(params.value)} (${params.percent}%)`,
          fontSize: isMobile.value ? 10 : 12,
        },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: {
          show: true,
          length: isMobile.value ? 5 : 10,
          length2: isMobile.value ? 5 : 10,
        },
        data: pieData.data,
      },
    ],
  });

  // 渲染按时间分布饼图
  renderYearPieEcharts({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      padding: isMobile.value ? [0, 0, 0, 0] : [5, 5, 5, 5],
      itemGap: isMobile.value ? 8 : 10,
    },
    series: [
      {
        name: `年份${labelName.value}分布`,
        type: 'pie',
        radius: isMobile.value ? '45%' : '60%',
        center: isMobile.value ? ['50%', '40%'] : ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 10, borderWidth: 2 },
        label: {
          show: true,
          formatter: (params: any) => `${params.name}\n${formatCurrency(params.value)} (${params.percent}%)`,
          fontSize: isMobile.value ? 10 : 12,
        },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: true, length: isMobile.value ? 5 : 10 },
        data: yearPieData.data,
      },
    ],
  });

  // 渲染月份趋势面积图
  const monthLabels = getMonths();
  const fullMonthLabels = getFullMonths();
  renderMonthEcharts({
    grid: {
      left: '3%',
      right: '4%',
      bottom: isMobile.value ? '20%' : '3%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;
        params.forEach((item: any) => { total += item.value || 0; });
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
      left: 'center',
      padding: isMobile.value ? [0, 0, 0, 0] : [5, 5, 5, 5],
      itemGap: isMobile.value ? 8 : 10,
    },
    xAxis: [
      {
        type: 'category',
        data: monthLabels,
        boundaryGap: false,
        axisTick: { alignWithLabel: true },
        axisLabel: { rotate: 45, fontSize: isMobile.value ? 10 : 12 },
        triggerEvent: true, // 开启事件触发，以便能点击横坐标
      },
    ],
    yAxis: [
      {
        type: 'value',
        axisLabel: { fontSize: isMobile.value ? 10 : 12 },
      },
    ],
    series: getMonthlySeriesData(),
  });

  // 绑定点击事件 (给月趋势面积图)
  const monthChartInstance = getMonthChartInstance();
  if (monthChartInstance) {
    monthChartInstance.off('click');
    monthChartInstance.on('click', (params: any) => {
      let monthIndex = -1;
      if (params.componentType === 'xAxis') {
        // 如果点击了 x 轴标签，我们需要通过文字去找索引
        monthIndex = monthLabels.findIndex(m => m === params.value);
      } else if (params.componentType === 'series') {
        // 点击了图表区域
        monthIndex = params.dataIndex;
      }
      
      if (monthIndex !== -1 && fullMonthLabels[monthIndex]) {
        const fullMonthStr = fullMonthLabels[monthIndex];
        const [year, month] = fullMonthStr.split('-').map(Number) as [number, number];
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        
        emit('monthSelect', { monthStr: fullMonthStr, startDate, endDate });
      }
    });
  }
};

// 刷新数据
const refreshData = async () => {
  try {
    const currentYear = selectedYear.value;

    const apiStatYear = isIncome.value ? incomeStatYear : expenseStatYear;
    const apiStatMonth = isIncome.value ? incomeStatMonth : expenseStatMonth;

    const [yearRes, monthRes] = await Promise.all([
      apiStatYear({}),
      apiStatMonth({}),
    ]);
    yearDataList.value = yearRes as YearData[];
    monthDataList.value = monthRes as MonthData[];

    const years = [...new Set(yearDataList.value.map((item) => item.year))].sort((a, b) => b - a);
    yearOptions.value = [
      { value: 'all', label: '全部' },
      ...years.map((year) => ({ value: year, label: year })),
    ];

    const yearExists = yearOptions.value.some((option) => option.value === currentYear);
    selectedYear.value = yearExists ? currentYear : 'all';

    updateCharts();
  } catch (error) {
    console.error(`获取${labelName.value}统计数据失败:`, error);
  }
};

onMounted(async () => {
  await refreshData();
});

watch([selectedYear, isMobile], (newVal) => {
  updateCharts();
  emit('yearChange', newVal[0]);
});

defineExpose({
  refreshData,
});
</script>

<template>
  <div class="transaction-dashboard">
    <div class="total-card" :class="isIncome ? 'income-theme' : 'expense-theme'">
      <div class="dashboard-header">
        <div class="total-stats">
          <div class="stat-item">
            <div class="stat-label">总{{ labelName }}</div>
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">{{ new Date().getFullYear() }}年总{{ labelName }}</div>
            <div class="stat-value">
              {{ formatCurrency(currentYearAmount) }}
            </div>
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
      <Card class="chart-item">
        <h3>年度{{ labelName }}趋势</h3>
        <EchartsUI ref="chartRef" />
      </Card>
      <Card class="chart-item">
        <h3>{{ labelName }}类型分布</h3>
        <EchartsUI ref="pieChartRef" />
      </Card>
      <Card class="chart-item">
        <h3>年份{{ labelName }}分布</h3>
        <EchartsUI ref="yearPieChartRef" />
      </Card>
      <Card class="chart-item full-width area-chart-item">
        <h3>月度{{ labelName }}趋势</h3>
        <EchartsUI ref="monthChartRef" />
      </Card>
    </div>
  </div>
</template>

<style scoped>
.transaction-dashboard {
  padding: 12px;
}

.dashboard-header {
  display: flex;
  gap: 24px;
  align-items: stretch;
  justify-content: space-between;
}

.year-selector-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px;
}

.year-select {
  width: 160px;
}

.year-label {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
}

.total-card {
  padding: 16px;
  margin-bottom: 12px;
  color: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgb(102 126 234 / 25%);
  transition: all 0.3s ease;
}

.income-theme {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.expense-theme {
  background: linear-gradient(135deg, #f093fb 0%, #764ba2 50%, #667eea 100%);
}

.total-card:hover {
  box-shadow: 0 12px 40px rgb(102 126 234 / 35%);
  transform: translateY(-2px);
}

.total-stats {
  display: flex;
  flex: 1;
  gap: 24px;
  align-items: center;
  justify-content: space-around;
  padding: 12px;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.3px;
  opacity: 0.85;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #fff 0%, #e0e7ff 100%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-divider {
  width: 1px;
  height: 60px;
  background: rgb(255 255 255 / 20%);
  border-radius: 0.5px;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.chart-item {
  height: 400px;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.chart-item:nth-child(4) {
  grid-column: 1 / -1;
  height: 320px;
}

.chart-item h3 {
  flex-shrink: 0;
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.chart-item :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.chart-item :deep(.echarts-ui),
.chart-item :deep(.ant-card-body) > div:not(h3) {
  flex: 1;
  min-height: 0;
}

@media (max-width: 1400px) {
  .chart-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-item:nth-child(4) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1200px) {
  .chart-container {
    grid-template-columns: 1fr;
  }

  .chart-item:nth-child(4) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .transaction-dashboard {
    padding: 8px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 12px;
  }

  .total-stats {
    flex-direction: row;
    gap: 12px;
    padding: 12px;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: rgb(255 255 255 / 20%);
  }

  .year-selector-wrapper {
    justify-content: center;
    width: 100%;
    background: rgb(255 255 255 / 10%);
    border-radius: 8px;
  }

  .year-select {
    width: 100% !important;
  }

  .chart-item {
    height: 350px;
    padding: 12px 8px;
  }

  .chart-item:nth-child(4) {
    height: 350px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 12px;
  }
}
</style>
