<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref, computed, nextTick } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { Button, Popconfirm, Card, Drawer } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { deleteData, deleteBatch, query } from '#/api/core/exerciseRecord';

import FormDrawerDemo from './form-drawer.vue';

interface RowType {
  id: any;
  userId: number;
  exerciseTypeId: string;
  exerciseDate: string;
  description: string;
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

const loadExerciseTypes = async () => {
  try {
    const res = await getByDictType('exercise_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getExerciseTypeLabel = (value: string) => {
  const option = dictOptions.value.find((item) => item.value === value);
  return option ? option.label : String(value);
};

// 计算月份统计数据
const monthlyStats = computed(() => {
  const monthlyData: Record<string, number> = {};

  tableData.value.forEach((row) => {
    if (row.exerciseDate) {
      try {
        // 解析日期，提取年月
        const date = new Date(row.exerciseDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
          }
          monthlyData[monthKey] += 1;
        }
      } catch (error) {
        console.warn('日期解析失败:', row.exerciseDate, error);
      }
    }
  });
  return monthlyData;
});

// 计算运动类型统计数据
const exerciseTypeStats = computed(() => {
  const typeData: Record<string, number> = {};

  tableData.value.forEach((row) => {
    const typeLabel = getExerciseTypeLabel(row.exerciseTypeId);
    if (!typeData[typeLabel]) {
      typeData[typeLabel] = 0;
    }
    typeData[typeLabel] += 1;
  });

  const result = Object.entries(typeData).map(([name, value]) => ({
    name,
    value
  }));
  return result;
});

// 计算总运动次数
const totalExercise = computed(() => {
  return tableData.value.length;
});

// 更新图表
const updateCharts = () => {

  const monthlyData = monthlyStats.value;
  const typeData = exerciseTypeStats.value;

  // 检查是否有数据
  if (Object.keys(monthlyData).length === 0 || typeData.length === 0) {
    return;
  }

  // 渲染柱状图
  renderLineChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>运动次数: ${data.value}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
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
        formatter: '{value}次'
      }
    },
    series: [{
      name: '月度运动次数',
      type: 'bar',
      barWidth: '60%',
      data: Object.keys(monthlyData).sort().map(key => monthlyData[key]),
      itemStyle: {
        color: '#4ecdc4'
      },
      emphasis: {
        itemStyle: {
          color: '#26a69a'
        }
      },
      label: {
        show: true,
        position: 'top',
        formatter: (params: any) => {
          return `${params.value}次`;
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
      name: '运动类型分布',
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
          return `${params.name}\n${params.value}次 (${params.percent}%)`;
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
  loadExerciseTypes();
});

// 抽屉相关
const drawerVisible = ref(false);
const currentRow = ref<any>(null);

const openFormDrawer = (row?: any) => {
  currentRow.value = row;
  drawerVisible.value = true;
};

const closeFormDrawer = () => {
  drawerVisible.value = false;
  currentRow.value = null;
};

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    // 搜索
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择运动类型',
        options: dictOptions, // 绑定类型选项
        allowClear: true, // 添加清除选项功能
        fieldNames: { label: 'label', value: 'value' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'exerciseTypeId',
      label: '运动类型',
    },
    {
      component: 'RangePicker',
      componentProps: {
        placeholder: ['开始日期', '结束日期'],
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
      fieldName: 'exerciseDateRange',
      label: '日期区间',
    },
    {
      component: 'Input',
      fieldName: 'description',
      label: '运动描述',
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
      field: 'exerciseTypeId',
      title: '运动类型',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      width: 120,
      formatter: ({ cellValue }) => {
        return getExerciseTypeLabel(cellValue);
      },
    },
    {
      field: 'exerciseDate',
      title: '运动日期',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      width: 120,
    },
    {
      field: 'exerciseCount',
      title: '运动数量',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      width: 120,
    },
    {
      field: 'description',
      title: '备注',
      sortable: true,
      headerAlign: 'center',
      align: 'left',
      width: 100,
    },
    {
      field: 'createTime',
      title: '创建时间',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      width: 180,
    },
    {
      field: 'updateTime',
      title: '修改时间',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      width: 180,
    },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ],
  keepSource: true,
  pagerConfig: {
    pageSize: 50,
    pageSizes: [10, 20, 30, 50, 100, 200, 1000, 10_000],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadExerciseTypes();
        // 处理查询条件
        const processedCondition = processQueryCondition(formValues);
        const result = await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: processedCondition,
        });

        // 确保数据格式正确
        if (result && result.items) {
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

// 新增运动记录
const openAddFormDrawer = () => {
  openFormDrawer();
};

const submitDeleteData = async () => {
  let checkboxRecords = gridApi.grid.getCheckboxRecords();
  if (checkboxRecords.length === 0) {
    return;
  }

  try {
    // 调用批量删除接口
    await deleteBatch({
      idList: checkboxRecords.map((item) => item.id),
    });
    // 删除完成后刷新表格
    gridApi.reload();
  } catch (error) {
    console.error('批量删除失败:', error);
  }
};

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
  if (condition.exerciseDateRange && Array.isArray(condition.exerciseDateRange)) {
    const [startDate, endDate] = condition.exerciseDateRange;
    if (startDate) {
      condition.startDate = startDate;
    }
    if (endDate) {
      condition.endDate = endDate;
    }
    // 删除原始的日期区间字段
    delete condition.exerciseDateRange;
  }
  return condition;
};

const tableReload = () => {
  gridApi.reload();
};
</script>

<template>
  <div class="vp-raw w-full">
    <!-- 图表区域 -->
    <div class="charts-section mb-6">
      <!-- 总运动次数卡片 -->
      <div class="total-card">
        <div class="total-content">
          <div class="total-icon">🏃</div>
          <div class="total-info">
            <div class="total-label">总运动次数</div>
            <div class="total-amount">{{ totalExercise }}次</div>
          </div>
        </div>
      </div>

      <!-- 图表容器 -->
      <div class="chart-container">
        <Card class="chart-item" title="月度运动趋势">
          <EchartsUI ref="lineChartRef" style="height: 300px;" />
        </Card>
        <Card class="chart-item" title="运动类型分布">
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

    <!-- 表单抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      :title="currentRow ? '编辑运动记录' : '新增运动记录'"
      :width="600"
    >
      <FormDrawerDemo
        :values="currentRow"
        @table-reload="tableReload"
        @close="closeFormDrawer"
      />
    </Drawer>
  </div>
</template>

<style scoped>
.charts-section {
  padding: 0;
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
  background: linear-gradient(135deg, #4ecdc4 0%, #26a69a 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(78, 205, 196, 0.3);
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
