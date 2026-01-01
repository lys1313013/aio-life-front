<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, computed, nextTick, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { Button, Popconfirm, Card, Select, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { deleteData, query, deleteBatch, statisticsByYear, statisticsByMonth } from '#/api/core/expense';

import { PAY_TYPE_OPTIONS } from '#/constants/expense';

import FormDrawerDemo from './form-drawer.vue';

interface RowType {
  id: any;
  category: string;
  color: string;
  price: string;
  productName: string;
  releaseDate: string;
  amt: number;
  expTypeId: number;
  remark: string;
  expTime: string;
  expDesc: string;
  counterparty: string;
  transactionId: string;
  createTime: string;
  updateTime: string;
}

// 图表相关引用
const lineChartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const areaChartRef = ref<EchartsUIType>();
const yearPieChartRef = ref<EchartsUIType>();
const { renderEcharts: renderLineChart } = useEcharts(lineChartRef);
const { renderEcharts: renderPieChart } = useEcharts(pieChartRef);
const { renderEcharts: renderAreaChart, getChartInstance: getAreaChartInstance } = useEcharts(areaChartRef);
const { renderEcharts: renderYearPieChart } = useEcharts(yearPieChartRef);
const { isMobile } = usePreferences();

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

const payTypeOptions = ref<Array<{ id: number; label: string; value: string }>>(PAY_TYPE_OPTIONS);

// 年度统计数据相关
interface ExpenseDetail {
  typeName: string; // 支出类型名称
  amt: number; // 支出金额
}

interface ExpenseData {
  year: number; // 年份
  detail: ExpenseDetail[]; // 该年份下的支出详情列表
}

// 月度统计数据相关
interface MonthlyExpenseData {
  year: number; // 年份
  month: number; // 月份
  detail: ExpenseDetail[]; // 该月份下的支出详情列表
}

// 年度选择相关
const selectedYear = ref<number | 'all'>('all');
const yearOptions = ref<{ value: string | number; label: string | number }[]>([{ value: 'all', label: '全部' }]);

// 表格数据引用
const tableData = ref<RowType[]>([]);

// 年度统计数据
const expData = ref<ExpenseData[]>([]);

// 月度统计数据
const monthlyExpData = ref<MonthlyExpenseData[]>([]);

const loadExpTypes = async () => {
  try {
    const res = await getByDictType('exp_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载类型失败:', error);
  }
};

const loadPayTypes = async () => {
  try {
    // 使用预定义的支付方式选项
    payTypeOptions.value = PAY_TYPE_OPTIONS;
  } catch (error) {
    console.error('加载支付方式失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: number) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find((item) => item.id === value);
  return option ? option.label : String(value);
};

// 获取支付方式标签
const getPayTypeLabel = (value: number) => {
  const option = payTypeOptions.value.find((item) => item.id === value);
  return option ? option.label : String(value);
};

// 计算支出类型统计数据
const expenseTypeStats = computed(() => {
  const typeData: Record<string, number> = {};

  filteredExpData.value.forEach((yearData) => {
    yearData.detail.forEach((item) => {
      const current = typeData[item.typeName] || 0;
      typeData[item.typeName] = current + item.amt;
    });
  });

  const result = Object.entries(typeData).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));
  return result;
});

// 获取年份列表
const getYears = computed(() => {
  return filteredExpData.value.map((item) => item.year).sort((a, b) => a - b);
});

// 获取所有支出类型
const getAllExpenseTypes = computed(() => {
  const types = new Set<string>();
  filteredExpData.value.forEach((yearData) => {
    yearData.detail.forEach((item) => {
      types.add(item.typeName);
    });
  });
  return Array.from(types);
});

// 计算每年的总支出
const getTotalExpenseByYear = computed(() => {
  return filteredExpData.value.map((yearData) => {
    const total = yearData.detail.reduce((sum, item) => sum + item.amt, 0);
    return Number(total.toFixed(2));
  });
});

// 获取年度柱状图的系列数据
const getBarChartSeries = computed(() => {
  const types = getAllExpenseTypes.value;
  const years = getYears.value;

  const series = types.map((type) => {
    const data = years.map((year) => {
      const yearData = filteredExpData.value.find((item) => item.year === year);
      if (yearData) {
        const detail = yearData.detail.find((d) => d.typeName === type);
        return detail ? detail.amt : 0;
      }
      return 0;
    });

    return {
      name: type,
      type: 'bar',
      barWidth: 10,
      barGap: '0%', // 柱子之间的间距
      stack: 'expense',
      emphasis: {
        focus: 'series',
      },
      data,
    };
  });

  // 添加总支出在最前面
  series.unshift({
    name: '总支出',
    type: 'bar',
    barWidth: 30,
    label: {
      show: true,
      position: 'top',
    },
    emphasis: {
      focus: 'series',
    },
    data: getTotalExpenseByYear.value,
  } as any);

  return series;
});

// 根据选中的年份过滤月度统计数据
const filteredMonthlyExpData = computed(() => {
  if (selectedYear.value === 'all') {
    return monthlyExpData.value;
  }
  return monthlyExpData.value.filter((item) => item.year === selectedYear.value);
});

// 获取月份列表
const getMonths = computed(() => {
  return filteredMonthlyExpData.value.map((item) => {
    const yearStr = item.year.toString();
    const monthStr = item.month.toString().padStart(2, '0');
    return `${yearStr}-${monthStr}`;
  }).sort();
});

// 获取堆叠面积图的系列数据
const getAreaChartSeries = computed(() => {
  // 获取所有支出类型
  const types = new Set<string>();
  filteredMonthlyExpData.value.forEach((monthData) => {
    monthData.detail.forEach((item) => {
      types.add(item.typeName);
    });
  });
  const expenseTypes = Array.from(types);

  const months = getMonths.value;

  const series = expenseTypes.map((type) => {
      const data = months.map((monthStr) => {
        // 解析月份字符串，获取年份和月份
        const [year, month] = monthStr.split('-').map(Number);
        // 查找对应的月度数据
        const monthData = filteredMonthlyExpData.value.find((item) => item.year === year && item.month === month);
        if (monthData) {
          // 查找该月份下的对应类型数据
          const detail = monthData.detail.find((d) => d.typeName === type);
          return detail ? detail.amt : 0;
        }
        return 0;
      });

    return {
      name: type,
      type: 'line',
      stack: 'expense',
      areaStyle: {},
      emphasis: {
        focus: 'series',
      },
      data,
    };
  });

  return series;
});

// 获取年度支出时间分布饼图数据
const getYearPieChartData = computed(() => {
  const yearTotals: Record<string, number> = {};

  filteredExpData.value.forEach((yearData) => {
    const yearTotal = yearData.detail.reduce((total, item) => total + item.amt, 0);
    yearTotals[yearData.year] = (yearTotals[yearData.year] || 0) + yearTotal;
  });

  const data = Object.entries(yearTotals)
    .map(([year, value]) => ({
      name: `${year}年`,
      value: Number(value.toFixed(2))
    }))
    .sort((a, b) => parseInt(a.name) - parseInt(b.name));

  return {
    data,
    total: data.reduce((sum, item) => sum + item.value, 0)
  };
});

// 根据选中的年份过滤数据
const filteredData = computed(() => {
  if (selectedYear.value === 'all') {
    return tableData.value;
  }
  return tableData.value.filter((row) => {
    if (row.expTime) {
      try {
        let date: Date;
        if (typeof row.expTime === 'string' && row.expTime.includes('T')) {
          date = new Date(row.expTime);
        } else if (typeof row.expTime === 'string' && row.expTime.includes(' ')) {
          date = new Date(row.expTime.replace(' ', 'T'));
        } else {
          date = new Date(row.expTime + 'T00:00:00');
        }
        return date.getFullYear() === selectedYear.value;
      } catch (error) {
        return false;
      }
    }
    return false;
  });
});

// 根据选中的年份过滤年度统计数据
const filteredExpData = computed(() => {
  if (selectedYear.value === 'all') {
    return expData.value;
  }
  return expData.value.filter((item) => item.year === selectedYear.value);
});

// 计算总支出
const totalExpense = computed(() => {
  return filteredExpData.value.reduce((total, yearData) => {
    const yearTotal = yearData.detail.reduce((sum, item) => sum + item.amt, 0);
    return total + yearTotal;
  }, 0);
});

// 计算今年总支出
const currentYearExpense = computed(() => {
  const currentYear = new Date().getFullYear();
  const currentYearData = expData.value.find(item => item.year === currentYear);
  if (currentYearData) {
    return currentYearData.detail.reduce((sum, item) => sum + item.amt, 0);
  } else {
    return 0;
  }
});

// 格式化金额显示
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
};

// 更新图表
const updateCharts = async () => {

  const typeData = expenseTypeStats.value;
  const barChartSeries = getBarChartSeries.value;
  const areaChartSeries = getAreaChartSeries.value;
  const years = getYears.value;

  // 检查是否有数据
  if (years.length === 0 || typeData.length === 0) {
    return;
  }

  // 渲染年度柱状图
  await renderLineChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算该年份的总支出
        params.forEach((item: any) => {
          if (item.seriesName !== '总支出') {
            total += item.value || 0;
          }
        });

        // 显示各项的金额和百分比
        params.forEach((item: any) => {
          if (item.seriesName !== '总支出' && item.value > 0) {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${formatCurrency(item.value)} (${percentage}%)<br/>`;
          }
        });

        tooltip += `总计: ${formatCurrency(total)}`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: years,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: barChartSeries as any
  });

  // 渲染饼图
  await renderPieChart({
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
    series: [{
      name: '支出类型分布',
      type: 'pie',
      radius: ['0%', '65%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        position: 'outside',
        formatter: (params: any) => {
          return `${params.name}\n${formatCurrency(params.value)} (${params.percent}%)`;
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
      data: typeData
    }]
  });

  // 渲染堆叠面积图
  const months = getMonths.value;
  await renderAreaChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算该月份的总支出
        params.forEach((item: any) => {
          total += item.value || 0;
        });

        // 显示各项的金额和百分比
        params.forEach((item: any) => {
          if (item.value > 0) {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ${formatCurrency(item.value)} (${percentage}%)<br/>`;
          }
        });

        tooltip += `总计: ${formatCurrency(total)}`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
    },
    grid: {
      left: '10',
      right: '10',
      bottom: '20',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: months,
      axisLabel: {
        rotate: 45,
        interval: 'auto'
      },
      triggerEvent: true,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: areaChartSeries.map(item => ({ ...item, symbol: 'emptyCircle', symbolSize: 4 })) as any
  });

  // 绑定点击事件
  const areaChartInstance = getAreaChartInstance();
  if (areaChartInstance) {
    areaChartInstance.off('click');
    // 监听 zr:click 以捕获所有点击事件，包括空白处，但这里我们主要关注组件点击
    areaChartInstance.on('click', (params: any) => {
      let monthStr = '';
      // 处理轴标签点击
      if (params.componentType === 'xAxis') {
        monthStr = params.value;
      }
      // 处理数据点点击
      else if (params.componentType === 'series') {
        monthStr = params.name;
      }

      if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
        const [year, month] = monthStr.split('-').map(Number) as [number, number];
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        message.success(`已选择月份: ${monthStr}`);

        if (gridApi && gridApi.formApi) {
           gridApi.formApi.setValues({
            expTimeRange: [startDate, endDate],
          });
        } else {
           console.error('gridApi or formApi is missing', gridApi);
        }
      }
    });
  } else {
    console.warn('Failed to get chart instance');
  }

  // 渲染年度支出时间分布饼图
  const yearPieData = getYearPieChartData.value;
  await renderYearPieChart({
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
        name: '年份支出分布',
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
};

// 从年度统计数据中提取年份并更新年份选项
const updateYearOptions = () => {
  const years = new Set<number>();
  expData.value.forEach((yearData) => {
    years.add(yearData.year);
  });

  // 生成年份选项
  const sortedYears = Array.from(years).sort((a, b) => b - a);
  yearOptions.value = [
    { value: 'all', label: '全部' },
    ...sortedYears.map(year => ({ value: year, label: year }))
  ];
};

// 获取年度和月度统计数据
const getYearlyStatistics = async () => {
  try {
    const [yearRes, monthRes] = await Promise.all([
      statisticsByYear({}),
      statisticsByMonth({})
    ]);
    expData.value = yearRes;
    monthlyExpData.value = monthRes;
    updateYearOptions();
    nextTick(() => {
      updateCharts();
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
};

// 监听年度选择变化
watch(selectedYear, () => {
  nextTick(() => {
    updateCharts();
  });
});

// 在组件挂载时加载值集数据和年度统计数据
onMounted(async () => {
  await loadExpTypes();
  await loadPayTypes();
  await getYearlyStatistics();
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: isMobile.value,
  schema: [
    // 搜索
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择支出类型',
        options: dictOptions, // 绑定类型选项
        allowClear: true, // 添加清除选项功能
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'expTypeId',
      label: '支出类型',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择支付方式',
        options: payTypeOptions, // 绑定支付方式选项
        allowClear: true, // 添加清除选项功能
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'payTypeId',
      label: '支付方式',
    },
    {
      component: 'RangePicker',
      componentProps: {
        placeholder: ['开始日期', '结束日期'],
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
      fieldName: 'expTimeRange',
      label: '日期区间',
    },
     {
      component: 'Input',
      fieldName: 'counterparty',
      label: '交易对方',
    },
    {
      component: 'Input',
      fieldName: 'expDesc',
      label: '交易描述',
    },
    {
      component: 'Input',
      fieldName: 'remark',
      label: '备注',
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  // 是否在字段值改变时提交表单
  submitOnChange: true,
  // 按下回车时提交表单
  submitOnEnter: true,
};

const gridOptions: VxeGridProps<RowType> = {
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  maxHeight: 800, // 表格最大高度
  checkboxConfig: {
    isShiftKey: true,
  },
  columns: [
    { type: 'checkbox', title: '', width: 60 },
    { title: '序号', type: 'seq', width: 50 },
    { title: '主键', visible: false },
    {
      field: 'transactionAmt',
      cellType: 'number',
      title: '交易金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      width: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) {
          return '';
        }
        return Number(cellValue).toFixed(2);
      },
    },
    {
      field: 'amt',
      cellType: 'number',
      title: '记账金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      width: 100,
      formatter: ({ cellValue }) => {
        if (cellValue === null || cellValue === undefined) {
          return '';
        }
        return Number(cellValue).toFixed(2);
      },
    },
    {
      field: 'expTypeId',
      title: '支出类型',
      sortable: true,
      width: 100,
      formatter: ({ cellValue }) => {
        return getIncomeTypeLabel(cellValue);
      },
    },
    { field: 'payTypeId', title: '支付方式', sortable: true, width: 100, formatter: ({ cellValue }) => { return getPayTypeLabel(cellValue); } },
    { field: 'remark', title: '备注', sortable: true, width: 100 },
    { field: 'expTime', title: '时间', sortable: true, width: 180 },
    { field: 'expDesc', title: '交易描述', sortable: true, width: 200 },
    { field: 'counterparty', title: '交易对方', sortable: true, width: 150 },
    { field: 'transactionId', title: '交易号', sortable: true, width: 200 },
    { field: 'transactionStatus', title: '交易状态', sortable: true, width: 200 },
    { field: 'merchantOrderNo', title: '商家订单号', sortable: true, width: 200 },
    { field: 'createTime', title: '创建时间', sortable: true, width: 180 },
    { field: 'updateTime', title: '修改时间', sortable: true, width: 180 },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ],
  showFooter: true, // 显示底部合计行
  footerMethod: ({ columns, data }) => {
    const footerData: Record<string, string>[] = [];
    const sums: Record<string, string> = {};
    columns.forEach((column) => {
      const field = column.field;
      if (field === 'amt') {
        const total = data.reduce((prev, row) => {
          const value = row[field];
          return prev + (Number(value) || 0);
        }, 0);
        sums[field] = `${total.toFixed(2)}`;
      } else {
        sums[field] = '';
      }
    });
    footerData.push(sums);
    return footerData;
  },
  keepSource: true,
  pagerConfig: {
    pageSize: 50,
    pageSizes: [10, 20, 30, 50, 100, 200, 1000, 10_000],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadExpTypes();
        // 处理查询条件
        const processedCondition = processQueryCondition(formValues);
        const result = await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: processedCondition,
        });

        // 确保数据格式正确 - 使用items字段而不是records
        if (result && result.items) {
          // 检查数据字段格式
          const firstRecord = result.items[0];
          if (firstRecord) {
            console.log('第一条记录字段:', Object.keys(firstRecord));
            console.log('amt字段值:', firstRecord.amt);
            console.log('expTime字段值:', firstRecord.expTime);
            console.log('expTypeId字段值:', firstRecord.expTypeId);
          }

          // 保存表格数据用于图表统计
        tableData.value = result.items;

        // 更新年度统计数据
        await getYearlyStatistics();
        } else {
          tableData.value = [];
        }

        return result;
      },
    },
  },
  toolbarConfig: {
    // 是否显示搜索表单控制按钮
    // @ts-ignore 正式环境时有完整的类型声明
    search: true,
  },
};

function openFormDrawer(row: RowType) {
  formDrawerApi
    .setData({
      // 表单值
      values: row,
    })
    .open();
}

function openAddFormDrawer() {
  formDrawerApi
    .setData({
      // 表单值
      values: { modelname: '' },
    })
    .open();
}

function submitDeleteData() {
  let checkboxRecords = gridApi.grid.getCheckboxRecords();
  console.log('checkboxRecords:', checkboxRecords);
  deleteBatch({
    idList: checkboxRecords.map((item) => item.id),
  }).then(() => gridApi.reload());
}

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      id: row.id,
    }).then(() => gridApi.reload());
  } catch (error) {
    console.error('捕获异常：', error);
  }
};

// 处理查询条件，将日期区间转换为开始时间和结束时间
const processQueryCondition = (formValues: any) => {
  const condition = { ...formValues };
  // 处理日期区间
  if (condition.expTimeRange && Array.isArray(condition.expTimeRange)) {
    const [startTime, endTime] = condition.expTimeRange;
    if (startTime) {
      // 确保开始时间包含完整的时间部分
      condition.startTime = startTime.includes(' ') ? startTime : `${startTime} 00:00:00`;
    }
    if (endTime) {
      // 确保结束时间包含完整的时间部分
      condition.endTime = endTime.includes(' ') ? endTime : `${endTime} 23:59:59`;
    }
    // 删除原始的日期区间字段
    delete condition.expTimeRange;
  }
  return condition;
};

const tableReload = () => {
  gridApi.reload();
};

const handleUpdateSuccess = async (updatedRow: any) => {
  // 更新表格数据而不刷新整个表格
  const { fullData } = gridApi.grid.getTableData();
  const targetRow = fullData.find((item) => item.id === updatedRow.id);
  if (targetRow) {
    Object.assign(targetRow, updatedRow);
  }

  // 刷新看板数据
  await getYearlyStatistics();
};
</script>

<template>
  <div class="vp-raw w-full">
    <FormDrawer @table-reload="tableReload" @update-success="handleUpdateSuccess" />

    <!-- 图表区域 -->
    <div class="charts-section">
      <!-- 总金额卡片 -->
      <div class="total-card">
        <div class="dashboard-header">
          <div class="total-stats">
            <div class="stat-item">
              <div class="stat-label">总支出</div>
              <div class="stat-value">{{ formatCurrency(totalExpense) }}</div>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <div class="stat-label">{{ new Date().getFullYear() }}年总支出</div>
              <div class="stat-value">{{ formatCurrency(currentYearExpense) }}</div>
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

      <!-- 图表容器 -->
      <div class="chart-container">
        <Card class="chart-item">
          <h3>年度支出趋势</h3>
          <EchartsUI ref="lineChartRef" />
        </Card>
        <Card class="chart-item">
          <h3>支出类型分布</h3>
          <EchartsUI ref="pieChartRef" />
        </Card>
        <Card class="chart-item">
          <h3>年度支出时间分布</h3>
          <EchartsUI ref="yearPieChartRef" />
        </Card>
        <Card class="chart-item full-width area-chart-item">
          <h3>月支出趋势</h3>
          <EchartsUI ref="areaChartRef" />
        </Card>
      </div>
    </div>

    <!-- 表格区域 -->
    <Grid>
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="openAddFormDrawer">
          新增
        </Button>
        <Button class="mr-2" type="primary" @click="submitDeleteData">
          删除
        </Button>
      </template>
      <template #action="{ row }">
        <a href="javascript:void(0)" @click="openFormDrawer(row)">编辑</a>
        &nbsp;&nbsp;
        <Popconfirm
          title="是否确认删除?"
          ok-text="是"
          cancel-text="否"
          @confirm="deleteRow(row)"
        >
          <a href="javascript:void(0)">删除</a>
        </Popconfirm>
      </template>
    </Grid>
  </div>
</template>

<style scoped>
.charts-section {
  padding: 12px;
  overflow: hidden;
}

/* 表格容器样式 */
:deep(.vxe-grid) {
  overflow: auto;
}

:deep(.vxe-table--body-wrapper) {
  overflow-x: auto;
}

:deep(.vxe-table--header-wrapper) {
  overflow-x: hidden;
}

.total-card {
  background: linear-gradient(135deg, #f093fb 0%, #764ba2 50%, #667eea 100%);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  color: white;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.total-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  transform: rotate(0deg);
  animation: shimmer 3s infinite linear;
}

@keyframes shimmer {
  0% {
    transform: rotate(0deg) translate(-50%, -50%);
  }
  100% {
    transform: rotate(360deg) translate(-50%, -50%);
  }
}

.total-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.35);
}

.dashboard-header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
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
  background: linear-gradient(135deg, #ffffff 0%, #f0f4ff 50%, #e0c3fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: #fff; /* Fallback */
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-divider {
  width: 1px;
  height: 60px;
  background: linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  border-radius: 0.5px;
}

.year-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.year-label {
  font-weight: 500;
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
}

.year-select {
  width: 160px;
}

@media (max-width: 768px) {
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
  }

  .year-select {
    width: 100% !important;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 13px;
  }
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  height: auto;
}

.chart-item {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-item h3 {
  margin: 12px;
  margin-bottom: 0px;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  flex-shrink: 0;
}

.chart-item.full-width {
  grid-column: 1 / -1;
}

.chart-item :deep(.ant-card-body) {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-item :deep(.echarts-ui) {
  flex: 1;
  min-height: 0;
}

/* 确保堆叠面积图底部有足够空间，避免与搜索框重叠 */
.area-chart-item {
  overflow: hidden;
}

@media (max-width: 1400px) {
  .chart-container {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-item.full-width {
    grid-column: auto;
  }
}

@media (max-width: 1200px) {
  .chart-container {
    grid-template-columns: 1fr;
  }

  .chart-item {
    height: 350px;
  }
}

@media (max-width: 768px) {
  .chart-item {
    height: 380px;
  }

  .charts-section {
    padding: 8px;
    margin-bottom: 0px;
  }
}
</style>
