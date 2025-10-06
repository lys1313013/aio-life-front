<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, computed, nextTick } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { Button, Popconfirm, Card } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { deleteData, query, deleteBatch } from '#/api/core/expense';

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
const { renderEcharts: renderLineChart } = useEcharts(lineChartRef);
const { renderEcharts: renderPieChart } = useEcharts(pieChartRef);

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

// 表格数据引用
const tableData = ref<RowType[]>([]);

const loadExpTypes = async () => {
  try {
    const res = await getByDictType('exp_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载类型失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: number) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find((item) => item.id === value);
  return option ? option.label : String(value);
};

// 计算月份统计数据
const monthlyStats = computed(() => {
  const monthlyData: Record<string, number> = {};

  tableData.value.forEach((row) => {
    if (row.expTime) {
      // 解析日期，提取年月
      const date = new Date(row.expTime);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }
      monthlyData[monthKey] += row.amt || 0;
    }
  });
  return monthlyData;
});

// 计算支出类型统计数据
const expenseTypeStats = computed(() => {
  const typeData: Record<string, number> = {};

  tableData.value.forEach((row) => {
    const typeLabel = getIncomeTypeLabel(row.expTypeId);
    if (!typeData[typeLabel]) {
      typeData[typeLabel] = 0;
    }
    typeData[typeLabel] += row.amt || 0;
  });

  const result = Object.entries(typeData).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));
  return result;
});

// 计算总支出
const totalExpense = computed(() => {
  const total = tableData.value.reduce((total, row) => total + (row.amt || 0), 0);
  return total;
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
const updateCharts = () => {

  const monthlyData = monthlyStats.value;
  const typeData = expenseTypeStats.value;

  // 检查是否有数据
  if (Object.keys(monthlyData).length === 0 || typeData.length === 0) {
    return;
  }

  // 渲染柱状图（替换直线图）
  renderLineChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>支出金额: ${formatCurrency(data.value)}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: Object.keys(monthlyData).sort(),
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [{
      name: '月度支出',
      type: 'bar',
      barWidth: '60%',
      data: Object.keys(monthlyData).sort().map(key => monthlyData[key]),
      itemStyle: {
        color: '#ff6b6b'
      },
      emphasis: {
        itemStyle: {
          color: '#ee5a52'
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          return formatCurrency(params.value);
        }
      }
    }]
  });

  // 渲染饼图
  renderPieChart({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center'
    },
    series: [{
      name: '支出类型分布',
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
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadExpTypes();
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    // 搜索
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择支出类型',
        options: dictOptions, // 绑定类型选项
        allowClear: true, // 添加清除选项功能
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'expTypeId',
      label: '支出类型',
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
  submitOnChange: false,
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
      field: 'amt',
      cellType: 'number',
      title: '金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      formatter: ({ cellValue }) => {
        return cellValue.toFixed(2);
      },
    },
    {
      field: 'expTypeId',
      title: '支出类型',
      sortable: true,
      formatter: ({ cellValue }) => {
        return getIncomeTypeLabel(cellValue);
      },
    },
    { field: 'remark', title: '备注', sortable: true },
    { field: 'expTime', title: '时间', sortable: true },
    { field: 'expDesc', title: '交易描述', sortable: true },
    { field: 'counterparty', title: '交易对方', sortable: true },
    { field: 'transactionId', title: '交易号', sortable: true },
    { field: 'createTime', title: '创建时间', sortable: true },
    { field: 'updateTime', title: '修改时间', sortable: true },
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
    const footerData = [];
    const sums = {};
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

          // 立即更新图表
          nextTick(() => {
            updateCharts();
          });
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
      condition.startTime = startTime;
    }
    if (endTime) {
      condition.endTime = endTime;
    }
    // 删除原始的日期区间字段
    delete condition.expTimeRange;
  }
  return condition;
};

const tableReload = () => {
  gridApi.reload();
};
</script>

<template>
  <div class="vp-raw w-full">
    <FormDrawer @table-reload="tableReload" />

    <!-- 图表区域 -->
    <div class="charts-section mb-6">
      <!-- 总金额卡片 -->
      <div class="total-card">
        <div class="total-content">
          <div class="total-icon">💸</div>
          <div class="total-info">
            <div class="total-label">总支出</div>
            <div class="total-amount">{{ formatCurrency(totalExpense) }}</div>
          </div>
        </div>
      </div>

      <!-- 图表容器 -->
      <div class="chart-container">
        <Card class="chart-item" title="月度支出趋势">
          <EchartsUI ref="lineChartRef" style="height: 300px;" />
        </Card>
        <Card class="chart-item" title="支出类型分布">
          <EchartsUI ref="pieChartRef" style="height: 300px;" />
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
  padding: 0;
}

.total-card {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
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
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  height: 350px;
}

.chart-item {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-item :deep(.ant-card-body) {
  padding: 0;
  height: 100%;
}

.chart-item :deep(.echarts-ui) {
  height: 300px;
}

@media (max-width: 1200px) {
  .chart-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .chart-item {
    height: 350px;
  }
}

@media (max-width: 768px) {
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
