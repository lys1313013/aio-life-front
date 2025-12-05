<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { Card, Select, Statistic, Row, Col } from 'ant-design-vue';

import { statisticsByMonth as incomeStatisticsByMonth } from '#/api/core/income';
import { statisticsByMonth as expenseStatisticsByMonth } from '#/api/core/expense';

// 图表引用
const balanceChartRef = ref<EchartsUIType>();
const incomeCategoryChartRef = ref<EchartsUIType>();
const expenseCategoryChartRef = ref<EchartsUIType>();
const yearChartRef = ref<EchartsUIType>();
const yearlyBalancePieChartRef = ref<EchartsUIType>();

const { renderEcharts: renderBalanceChart } = useEcharts(balanceChartRef);
const { renderEcharts: renderIncomeCategoryChart } = useEcharts(incomeCategoryChartRef);
const { renderEcharts: renderExpenseCategoryChart } = useEcharts(expenseCategoryChartRef);
const { renderEcharts: renderYearChart } = useEcharts(yearChartRef);
const { renderEcharts: renderYearlyBalancePieChart } = useEcharts(yearlyBalancePieChartRef);

// 数据接口
interface FinanceDetail {
  typeName: string;
  amt: number;
}

interface FinanceData {
  year: number;
  month?: number;
  detail: FinanceDetail[];
}

// 响应式数据
const incomeData = ref<FinanceData[]>([]);
const expenseData = ref<FinanceData[]>([]);
const selectedYear = ref<string>('all');
const yearOptions = ref([{ value: 'all', label: '全部' }]);

// 关键指标
const totalIncome = ref(0);
const totalExpense = ref(0);
const totalBalance = ref(0);
const monthlyBalances = ref<{month: string, income: number, expense: number, balance: number}[]>([]);
const yearlyBalances = ref<{year: number, income: number, expense: number, balance: number}[]>([]);

// 格式化金额
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
  }).format(amount);
};

// 公共图表配置
const getCommonChartConfig = (title: string) => ({
  tooltip: {
    trigger: 'axis' as const,
    axisPointer: { type: 'shadow' as const }
  },
  legend: { data: ['收入', '支出', '结余'] },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: { type: 'category' as const },
  yAxis: {
    type: 'value' as const,
    axisLabel: { formatter: '{value}' }
  }
});

// 工具提示格式化函数
const tooltipFormatter = (params: any) => {
  const incomeParam = params.find((p: any) => p.seriesName === '收入');
  const expenseParam = params.find((p: any) => p.seriesName === '支出');
  const balanceParam = params.find((p: any) => p.seriesName === '结余');
  
  return `${incomeParam?.name}<br/>
          ${incomeParam?.marker} ${incomeParam?.seriesName}: ${formatCurrency(incomeParam?.value || 0)}<br/>
          ${expenseParam?.marker} ${expenseParam?.seriesName}: ${formatCurrency(expenseParam?.value || 0)}<br/>
          ${balanceParam?.marker} ${balanceParam?.seriesName}: ${formatCurrency(balanceParam?.value || 0)}`;
};

// 加载数据
const loadData = async () => {
  try {
    // 使用示例数据
    incomeData.value = await incomeStatisticsByMonth({});
    // 加载支出数据
    expenseData.value = await expenseStatisticsByMonth({});
    
    // 处理数据
    processData();
    
    // 更新年份选项
    updateYearOptions();
    
    // 更新图表
    updateCharts();
  } catch (error) {
    console.error('加载数据失败:', error);
  }
};

// 处理数据
const processData = () => {
  // 计算总收入、总支出、总结余
  totalIncome.value = calculateTotal(incomeData.value);
  totalExpense.value = calculateTotal(expenseData.value);
  totalBalance.value = totalIncome.value - totalExpense.value;
  
  // 计算月度结余
  calculateMonthlyBalances();
  
  // 计算年度结余
  calculateYearlyBalances();
};

// 计算总额
const calculateTotal = (data: FinanceData[]) => {
  return data.reduce((total, item) => {
    const itemTotal = item.detail.reduce((sum, detail) => sum + detail.amt, 0);
    return total + itemTotal;
  }, 0);
};

// 计算月度结余
const calculateMonthlyBalances = () => {
  const monthlyData: Record<string, {income: number, expense: number}> = {};
  
  // 处理收入数据
  incomeData.value.forEach(item => {
    const monthKey = `${item.year}-${item.month?.toString().padStart(2, '0') || '01'}`;
    const monthTotal = item.detail.reduce((sum, detail) => sum + detail.amt, 0);
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    monthlyData[monthKey].income += monthTotal;
  });
  
  // 处理支出数据
  expenseData.value.forEach(item => {
    const monthKey = `${item.year}-${item.month?.toString().padStart(2, '0') || '01'}`;
    const monthTotal = item.detail.reduce((sum, detail) => sum + detail.amt, 0);
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    monthlyData[monthKey].expense += monthTotal;
  });
  
  // 转换为数组并倒序排序
  monthlyBalances.value = Object.entries(monthlyData)
    .map(([monthKey, data]) => ({
      month: monthKey,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense
    }))
    .sort((a, b) => b.month.localeCompare(a.month));
};

// 计算年度结余
const calculateYearlyBalances = () => {
  const yearlyData: Record<number, {income: number, expense: number}> = {};
  
  // 处理收入数据
  incomeData.value.forEach(item => {
    const yearTotal = item.detail.reduce((sum, detail) => sum + detail.amt, 0);
    
    if (!yearlyData[item.year]) {
      yearlyData[item.year] = { income: 0, expense: 0 };
    }
    yearlyData[item.year]!.income += yearTotal;
  });
  
  // 处理支出数据
  expenseData.value.forEach(item => {
    const yearTotal = item.detail.reduce((sum, detail) => sum + detail.amt, 0);
    
    if (!yearlyData[item.year]) {
      yearlyData[item.year] = { income: 0, expense: 0 };
    }
    yearlyData[item.year]!.expense += yearTotal;
  });
  
  // 转换为数组并倒序排序
  yearlyBalances.value = Object.entries(yearlyData)
    .map(([year, data]) => ({
      year: parseInt(year),
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense
    }))
    .sort((a, b) => b.year - a.year);
};

// 更新年份选项
const updateYearOptions = () => {
  const years = new Set<number>();
  
  incomeData.value.forEach(item => years.add(item.year));
  expenseData.value.forEach(item => years.add(item.year));
  
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  
  yearOptions.value = [
    { value: 'all', label: '全部' },
    ...sortedYears.map(year => ({ value: year.toString(), label: `${year}年` }))
  ];
};

// 过滤数据
const filteredData = computed(() => {
  if (selectedYear.value === 'all') {
    return {
      income: incomeData.value,
      expense: expenseData.value,
      monthly: monthlyBalances.value,
      yearly: yearlyBalances.value
    };
  }
  
  const year = parseInt(selectedYear.value);
  
  return {
    income: incomeData.value.filter(item => item.year === year),
    expense: expenseData.value.filter(item => item.year === year),
    monthly: monthlyBalances.value.filter(item => item.month.startsWith(selectedYear.value as string)),
    yearly: yearlyBalances.value.filter(item => item.year === year)
  };
});


// 更新图表
const updateCharts = () => {
  updateBalanceChart();
  updateIncomeCategoryChart();
  updateExpenseCategoryChart();
  updateYearChart();
  updateYearlyBalancePieChart();
};

// 更新结余趋势图
const updateBalanceChart = () => {
  const data = filteredData.value.monthly;
  
  if (!data || data.length === 0) return;
  
  const chartData = [...data].reverse();
  
  renderBalanceChart({
    ...getCommonChartConfig('月度收支结余趋势'),
    tooltip: {
      ...getCommonChartConfig('').tooltip,
      formatter: tooltipFormatter
    },
    xAxis: {
      type: 'category',
      data: chartData.map(item => item.month),
      axisLabel: { rotate: 45 }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: chartData.map(item => item.income),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: chartData.map(item => item.expense),
        itemStyle: { color: '#ff4d4f' }
      },
      {
        name: '结余',
        type: 'line',
        data: chartData.map(item => item.balance),
        itemStyle: { color: '#1890ff' },
        lineStyle: { width: 3 }
      }
    ]
  });
};

// 更新分类占比图通用函数
const updateCategoryChart = (
  data: FinanceData[] | undefined,
  renderFunc: (opt: any) => void,
  seriesName: string
) => {
  const types = new Map<string, number>();
  
  // 统计类型
  data?.forEach(item => {
    item.detail?.forEach(detail => {
      const current = types.get(detail.typeName) || 0;
      types.set(detail.typeName, current + detail.amt);
    });
  });
  
  const chartData = Array.from(types.entries()).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));
  
  if (chartData.length === 0) return;
  
  renderFunc({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.seriesName}<br/>${params.marker} ${params.name}: ${formatCurrency(params.value)}<br/>占比: ${params.percent}%`;
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: seriesName,
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: chartData,
        label: {
          show: true,
          formatter: (params: any) => {
            return `${params.name}\n${formatCurrency(params.value)}\n${params.percent}%`;
          },
          fontSize: 12
        },
        labelLine: {
          show: true
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  });
};

// 更新收入分类占比图
const updateIncomeCategoryChart = () => {
  updateCategoryChart(filteredData.value.income, renderIncomeCategoryChart, '收入分类');
};

// 更新支出分类占比图
const updateExpenseCategoryChart = () => {
  updateCategoryChart(filteredData.value.expense, renderExpenseCategoryChart, '支出分类');
};

// 更新年度对比图
const updateYearChart = () => {
  const data = filteredData.value.yearly;
  
  if (!data || data.length === 0) return;
  
  const chartData = [...data].reverse();
  
  renderYearChart({
    ...getCommonChartConfig('年度收支结余对比'),
    tooltip: {
      ...getCommonChartConfig('').tooltip,
      formatter: tooltipFormatter
    },
    xAxis: {
      type: 'category',
      data: chartData.map(item => `${item.year}年`)
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: chartData.map(item => item.income),
        itemStyle: { color: '#52c41a' },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value)
        }
      },
      {
        name: '支出',
        type: 'bar',
        data: chartData.map(item => item.expense),
        itemStyle: { color: '#ff4d4f' },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value)
        }
      },
      {
        name: '结余',
        type: 'line',
        data: chartData.map(item => item.balance),
        itemStyle: { color: '#1890ff' },
        lineStyle: { width: 3 },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => formatCurrency(params.value)
        }
      }
    ]
  });
};

// 更新每年结余占比饼状图
const updateYearlyBalancePieChart = () => {
  const data = filteredData.value.yearly;
  
  if (!data || data.length === 0) return;
  
  // 计算每年结余占比数据
  const pieData = data.map(item => ({
    name: `${item.year}年`,
    value: Math.abs(item.balance),
    balance: item.balance
  })).filter(item => item.value > 0);
  
  if (pieData.length === 0) return;
  
  renderYearlyBalancePieChart({
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const { name, value, data } = params;
        const balance = data.balance;
        const sign = balance >= 0 ? '盈余' : '亏损';
        return `${name}<br/>${params.marker} ${sign}: ${formatCurrency(Math.abs(balance))}<br/>占比: ${((value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%`;
      }
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [
      {
        name: '每年结余占比',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            const balance = params.data.balance;
            const sign = balance >= 0 ? '盈余' : '亏损';
            const percentage = params.percent;
            return `${params.name}\n${sign}: ${formatCurrency(Math.abs(balance))}\n${percentage}%`;
          },
          fontSize: 12,
          fontWeight: 'normal'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            formatter: (params: any) => {
              const balance = params.data.balance;
              const sign = balance >= 0 ? '盈余' : '亏损';
              return `${params.name}\n${sign}\n${formatCurrency(Math.abs(balance))}`;
            }
          }
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 5
        },
        data: pieData
      }
    ]
  });
};

// 监听年份选择变化
watch(selectedYear, () => {
  processData();
  updateCharts();
});

// 组件挂载时加载数据
onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="finance-dashboard">
    <!-- 页面标题和年份选择 -->
    <div class="page-header">
      <h1 class="page-title">财务综合看板</h1>
      <div class="year-selector">
        <Select
          v-model:value="selectedYear"
          :options="yearOptions"
          style="width: 120px"
          placeholder="选择年份"
        />
      </div>
    </div>

    <!-- 关键指标统计 -->
    <Row :gutter="[12, 12]" class="stats-row">
      <Col :xs="24" :sm="12" :md="12" :lg="6">
        <Card>
          <Statistic
            title="总收入"
            :value="totalIncome"
            :precision="2"
            :value-style="{ color: '#52c41a' }"
          />
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :md="12" :lg="6">
        <Card>
          <Statistic
            title="总支出"
            :value="totalExpense"
            :precision="2"
            :value-style="{ color: '#ff4d4f' }"
          />
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :md="12" :lg="6">
        <Card>
          <Statistic
            title="总结余"
            :value="totalBalance"
            :precision="2"
            :value-style="{ color: totalBalance >= 0 ? '#1890ff' : '#ff4d4f' }"
          />
        </Card>
      </Col>
      <Col :xs="24" :sm="12" :md="12" :lg="6">
        <Card>
          <Statistic
            title="结余率"
            :value="totalIncome > 0 ? (totalBalance / totalIncome * 100) : 0"
            :precision="1"
            suffix="%"
            :value-style="{ color: totalBalance >= 0 ? '#52c41a' : '#ff4d4f' }"
          />
        </Card>
      </Col>
    </Row>

    <!-- 图表和数据区域 -->
    <div class="dashboard-content">
      <Row :gutter="[12, 12]">
        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card class="chart-card" title="年度收支结余对比">
            <EchartsUI ref="yearChartRef" style="height: 300px;" />
          </Card>
        </Col>
        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card class="chart-card" title="每年结余占比">
            <EchartsUI ref="yearlyBalancePieChartRef" style="height: 300px;" />
          </Card>
        </Col>

        <Col :span="24">
          <Card class="chart-card" title="月度收支结余趋势">
            <EchartsUI ref="balanceChartRef" style="height: 400px;" />
          </Card>
        </Col>

        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card class="chart-card" title="收入分类占比">
            <EchartsUI ref="incomeCategoryChartRef" style="height: 300px;" />
          </Card>
        </Col>
        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card class="chart-card" title="支出分类占比">
            <EchartsUI ref="expenseCategoryChartRef" style="height: 300px;" />
          </Card>
        </Col>

        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card title="月度结余明细" class="data-card">
            <div class="data-table">
              <div class="table-header">
                <div class="table-cell">月份</div>
                <div class="table-cell">收入</div>
                <div class="table-cell">支出</div>
                <div class="table-cell">结余</div>
              </div>
              <div 
                v-for="item in filteredData.monthly" 
                :key="item.month" 
                class="table-row"
                :class="{ positive: item.balance >= 0, negative: item.balance < 0 }"
              >
                <div class="table-cell">{{ item.month }}</div>
                <div class="table-cell income">{{ formatCurrency(item.income) }}</div>
                <div class="table-cell expense">{{ formatCurrency(item.expense) }}</div>
                <div class="table-cell balance">{{ formatCurrency(item.balance) }}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col :xs="24" :sm="24" :md="12" :lg="12">
          <Card title="年度结余明细" class="data-card">
            <div class="data-table">
              <div class="table-header">
                <div class="table-cell">年份</div>
                <div class="table-cell">收入</div>
                <div class="table-cell">支出</div>
                <div class="table-cell">结余</div>
              </div>
              <div 
                v-for="item in filteredData.yearly" 
                :key="item.year" 
                class="table-row"
                :class="{ positive: item.balance >= 0, negative: item.balance < 0 }"
              >
                <div class="table-cell">{{ item.year }}年</div>
                <div class="table-cell income">{{ formatCurrency(item.income) }}</div>
                <div class="table-cell expense">{{ formatCurrency(item.expense) }}</div>
                <div class="table-cell balance">{{ formatCurrency(item.balance) }}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  </div>
</template>

<style scoped>
.finance-dashboard {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  background: white;
  padding: 12px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.stats-row {
  margin-bottom: 20px;
}

.data-card {
  height: 100%;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  max-height: 400px;
  overflow-y: auto;
  position: relative;
}

.table-header,
.table-row {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 0;
}

.table-cell {
  flex: 1;
  padding: 4px 8px;
  text-align: right;
  font-size: 14px;
}

.table-cell:first-child {
  text-align: left;
  flex: 0.8;
}

.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #fafafa;
  font-weight: 600;
  color: #595959;
}

.table-row.positive .balance {
  color: #52c41a;
  font-weight: 600;
}

.table-row.negative .balance {
  color: #ff4d4f;
  font-weight: 600;
}

.table-row .income {
  color: #52c41a;
}

.table-row .expense {
  color: #ff4d4f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .finance-dashboard {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  /* 响应式图表高度 */
  .chart-card .echarts-ui {
    height: 250px !important;
  }
  
  /* 优化数据表格在手机端的显示 */
  .data-table {
    overflow-x: auto;
  }
  
  .table-header,
  .table-row {
    min-width: 400px;
  }
  
  .table-cell {
    font-size: 12px;
    padding: 4px 6px;
  }
  
  /* 优化图表配置 */
  .chart-card .ant-card-head-title {
    font-size: 14px;
  }
}

</style>