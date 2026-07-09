<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { Card, Select } from 'ant-design-vue';

import {
  statisticsByMonth as expenseStatMonth,
  statisticsByYear as expenseStatYear,
} from '#/api/core/expense';
import {
  statisticsByMonth as incomeStatMonth,
  statisticsByYear as incomeStatYear,
} from '#/api/core/income';

const props = defineProps({
  type: {
    type: String,
    default: 'income',
    validator: (val: string) => ['expense', 'income'].includes(val),
  },
});

// 定义事件
const emit = defineEmits<{
  (e: 'yearChange', year: 'all' | number): void;
  (
    e: 'monthSelect',
    payload: { endDate: string; monthStr: string; startDate: string },
  ): void;
}>();

const chartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const yearPieChartRef = ref<EchartsUIType>();
const monthChartRef = ref<EchartsUIType>();

const { renderEcharts } = useEcharts(chartRef);
const { renderEcharts: renderPieEcharts } = useEcharts(pieChartRef);
const { renderEcharts: renderYearPieEcharts } = useEcharts(yearPieChartRef);
const {
  renderEcharts: renderMonthEcharts,
  getChartInstance: getMonthChartInstance,
} = useEcharts(monthChartRef);

const { isDark, isMobile } = usePreferences();

const isIncome = computed(() => props.type === 'income');
const labelName = computed(() => (isIncome.value ? '收入' : '支出'));

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
const selectedYear = ref<'all' | number>(new Date().getFullYear());

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
  data =
    selectedYear.value === 'all'
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

// 获取时间维度饼图数据（年份或月份）
const getTimePieData = (useMonthly: boolean) => {
  const dataSource = useMonthly
    ? filteredMonthlyData.value
    : filteredData.value;
  const keySuffix = useMonthly ? '月' : '年';
  const keyField = useMonthly ? 'month' : 'year';

  const totals: Record<string, number> = {};
  dataSource.forEach((item: any) => {
    const key = `${item[keyField]}${keySuffix}`;
    const itemTotal = item.detail.reduce(
      (sum: number, cur: any) => sum + cur.amt,
      0,
    );
    totals[key] = (totals[key] || 0) + itemTotal;
  });

  const data = Object.entries(totals)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => Number.parseInt(a.name) - Number.parseInt(b.name));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return {
    data,
    total: Number(total.toFixed(2)),
  };
};

const getBarSeriesData = (useMonthly: boolean) => {
  const types = getTypes();
  const dataSource = useMonthly
    ? filteredMonthlyData.value
    : filteredData.value;
  const totalLabel = useMonthly ? '月度合计' : '年度合计';
  const totals = useMonthly ? getMonthlyTotalAmount() : getTotalAmountByYear();

  const getValue = (item: any, type: string) => {
    const detail = item.detail.find((d: any) => d.typeName == type);
    return detail ? detail.amt : 0;
  };

  const series: any[] = types.map((type) => ({
    name: type,
    type: 'bar',
    stack: 'amount',
    barMaxWidth: 50,
    barGap: '20%',
    emphasis: { focus: 'series' },
    label: { show: false },
    data: dataSource.map((item: any) => getValue(item, type)),
  }));

  series.push({
    name: totalLabel,
    type: 'bar',
    stack: '',
    data: totals,
    barMaxWidth: 50,
    barGap: '-100%',
    z: 10,
    label: {
      show: true,
      position: 'top',
      formatter: (params: any) =>
        params.value > 0 ? formatCurrency(params.value) : '',
      fontSize: 12,
      // 跟随主题切换，避免暗色模式下看不清
      color: isDark.value ? 'rgba(255, 255, 255, 0.85)' : '#333',
    },
    itemStyle: { color: 'rgba(0,0,0,0)' },
    emphasis: { disabled: true },
  });

  return series;
};

// 是否为单年模式
const isSingleYear = computed(() => selectedYear.value !== 'all');

// 环形图圆心标题配置
const getPieTitleConfig = (total: number) => ({
  text: `{val|${formatCurrency(total)}}`,
  top: 'middle' as const,
  left: 'center' as const,
  textStyle: {
    rich: {
      val: {
        fontSize: isMobile.value ? 16 : 20,
        fontWeight: 'bold' as const,
      },
    },
  },
});

// 更新图表
const updateCharts = () => {
  // 总金额始终基于全部数据，不受年份筛选影响
  const allYearsTotal = yearDataList.value.reduce((sum, year) => {
    return sum + year.detail.reduce((s, d) => s + d.amt, 0);
  }, 0);
  totalAmount.value = Number(allYearsTotal.toFixed(2));

  // 选中年份金额（全部时显示当前年度）
  const targetYear =
    selectedYear.value === 'all'
      ? new Date().getFullYear()
      : selectedYear.value;
  const targetYearData = yearDataList.value.find(
    (item) => item.year === targetYear,
  );
  currentYearAmount.value = targetYearData
    ? targetYearData.detail.reduce((sum, item) => sum + item.amt, 0)
    : 0;

  // 类型分布饼图仍然基于筛选后的数据
  const pieData = getPieChartData();

  // 渲染柱状图（全部年份 → 年度趋势，单年 → 月度趋势）
  const isYearlyBar = !isSingleYear.value;
  const xAxisData = isYearlyBar ? getYears() : getMonths();
  // X 轴标签较多时旋转，避免与底部图例重叠
  const xAxisLabelRotate =
    xAxisData.length > 8 ? 30 : xAxisData.length > 6 ? 15 : 0;
  renderEcharts({
    grid: {
      left: '3%',
      right: '4%',
      // 为底部图例 + X 轴标签预留足够空间，避免重叠
      bottom: isMobile.value
        ? xAxisData.length > 6
          ? '28%'
          : '22%'
        : xAxisData.length > 8
          ? '22%'
          : '16%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;
        const totalLabel = isYearlyBar ? '年度合计' : '月度合计';
        params.forEach((item: any) => {
          if (item.seriesName !== totalLabel) total += item.value || 0;
        });
        params.forEach((item: any) => {
          if (item.seriesName !== totalLabel && item.value > 0) {
            const percentage =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${item.value} (${percentage}%)<br/>`;
          }
        });
        tooltip += `<div style="border-top:1px solid #eee;margin-top:5px;padding-top:5px;font-weight:bold;">
          ${totalLabel}: ${formatCurrency(total)}
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
      formatter: (name: string) =>
        name === '年度合计' || name === '月度合计' ? '' : name,
    },
    xAxis: [
      {
        type: 'category',
        data: xAxisData,
        axisTick: { alignWithLabel: true },
        axisLabel: {
          rotate: xAxisLabelRotate,
          fontSize: isMobile.value ? 10 : 12,
          // 标签过长时自动省略中间字符，防止互相挤压
          hideOverlap: true,
        },
      },
    ],
    yAxis: [{ type: 'value' }],
    series: getBarSeriesData(!isYearlyBar),
  });

  // 渲染类型分布环形图
  const modifiedPieData = pieData.data.map((item) => {
    const percent = pieData.total > 0 ? (item.value / pieData.total) * 100 : 0;
    if (percent < 1) {
      return {
        ...item,
        label: { show: false },
        labelLine: { show: false },
      };
    }
    return item;
  });

  renderPieEcharts({
    title: getPieTitleConfig(pieData.total),
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
        radius: isMobile.value ? ['35%', '55%'] : ['40%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderWidth: 2 },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) =>
            `${params.name}\n${formatCurrency(params.value)} (${params.percent}%)`,
          fontSize: isMobile.value ? 10 : 12,
        },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: {
          show: true,
          length: isMobile.value ? 5 : 10,
          length2: isMobile.value ? 5 : 10,
        },
        data: modifiedPieData,
      },
    ],
  });

  // 渲染时间分布饼图（全部年份 → 年份分布，单年 → 月份分布）
  const timePieData = getTimePieData(isSingleYear.value);
  const timePieTitle = isSingleYear.value
    ? `月份${labelName.value}分布`
    : `年份${labelName.value}分布`;

  const modifiedTimePieData = timePieData.data.map((item) => {
    const percent =
      timePieData.total > 0 ? (item.value / timePieData.total) * 100 : 0;
    if (percent < 1) {
      return {
        ...item,
        label: { show: false },
        labelLine: { show: false },
      };
    }
    return item;
  });

  renderYearPieEcharts({
    title: getPieTitleConfig(timePieData.total),
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
        name: timePieTitle,
        type: 'pie',
        radius: isMobile.value ? ['35%', '55%'] : ['40%', '65%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderWidth: 2 },
        label: {
          show: true,
          formatter: (params: any) =>
            `${params.name}\n${formatCurrency(params.value)} (${params.percent}%)`,
          fontSize: isMobile.value ? 10 : 12,
        },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: true, length: isMobile.value ? 5 : 10 },
        data: modifiedTimePieData,
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
      // 面积图 X 轴标签固定旋转 45°，需要更多底部空间避让图例
      bottom: isMobile.value ? '26%' : '18%',
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;
        params.forEach((item: any) => {
          total += item.value || 0;
        });
        params.forEach((item: any) => {
          if (item.value > 0) {
            const percentage =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
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
        monthIndex = monthLabels.indexOf(params.value);
      } else if (params.componentType === 'series') {
        // 点击了图表区域
        monthIndex = params.dataIndex;
      }

      if (monthIndex !== -1 && fullMonthLabels[monthIndex]) {
        const fullMonthStr = fullMonthLabels[monthIndex] as string;
        const [year, month] = fullMonthStr.split('-').map(Number) as [
          number,
          number,
        ];
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

    const years = [
      ...new Set(yearDataList.value.map((item) => item.year)),
    ].sort((a, b) => b - a);
    yearOptions.value = [
      { value: 'all', label: '全部' },
      ...years.map((year) => ({ value: year, label: year })),
    ];

    const yearExists = yearOptions.value.some(
      (option) => option.value === currentYear,
    );
    selectedYear.value = yearExists ? currentYear : new Date().getFullYear();

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
// 主题切换时重绘，更新柱顶合计等文字颜色
watch(isDark, () => {
  updateCharts();
});

defineExpose({
  refreshData,
});
</script>

<template>
  <div class="transaction-dashboard">
    <div
      class="total-card"
      :class="isIncome ? 'income-theme' : 'expense-theme'"
    >
      <div class="dashboard-header">
        <div class="total-stats">
          <div class="stat-item">
            <div class="stat-label">总{{ labelName }}</div>
            <div class="stat-value">{{ formatCurrency(totalAmount) }}</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">
              {{ selectedYear === 'all' ? new Date().getFullYear() : selectedYear }}年总{{ labelName }}
            </div>
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
        <h3>{{ isSingleYear ? '月度' : '年度' }}{{ labelName }}趋势</h3>
        <EchartsUI ref="chartRef" />
      </Card>
      <Card class="chart-item">
        <h3>{{ labelName }}类型分布</h3>
        <EchartsUI ref="pieChartRef" />
      </Card>
      <Card class="chart-item">
        <h3>{{ isSingleYear ? '月份' : '年份' }}{{ labelName }}分布</h3>
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
