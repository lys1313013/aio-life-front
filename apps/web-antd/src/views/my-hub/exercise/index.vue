<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { usePreferences } from '@vben/preferences';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Button, Card, Modal, Popconfirm, Select, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/userDictType';
import { deleteBatch, getStatistics, query } from '#/api/core/exerciseRecord';

import FormDrawerDemo from './form-drawer.vue';

interface RowType {
  id: any;
  userId: number;
  exerciseTypeId: string;
  exerciseCount: number;
  exerciseDate: string;
  description: string;
}

// 图表相关引用
const lineChartRef = ref<EchartsUIType>();
const pieChartRef = ref<EchartsUIType>();
const dailyChartRef = ref<EchartsUIType>();
const { renderEcharts: renderLineChart } = useEcharts(lineChartRef);
const { renderEcharts: renderPieChart } = useEcharts(pieChartRef);
const { renderEcharts: renderDailyChart } = useEcharts(dailyChartRef);
const { isMobile } = usePreferences();

// 运动类型筛选
const selectedExerciseType = ref<string | undefined>(undefined);

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

// 表格数据引用
const tableData = ref<RowType[]>([]);

const loadExerciseTypes = async () => {
  try {
    const res = await getByDictType('exercise_type');
    dictOptions.value = res.dictDetailList.map((item: any) => ({
      id: Number(item.id), // Ensure compatibility if needed
      label: item.dictLabel || item.label,
      value: String(item.id),
    }));
    // 默认选择第一种运动类型
    if (!selectedExerciseType.value && dictOptions.value.length > 0) {
      selectedExerciseType.value = dictOptions.value[0]?.value;
    }
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getExerciseTypeLabel = (value: string) => {
  const option = dictOptions.value.find((item) => item.value === value);
  return option ? option.label : String(value);
};

// 根据运动类型 value 派生稳定的 tag 颜色
const typeColorMap = [
  'blue',
  'green',
  'orange',
  'purple',
  'cyan',
  'magenta',
  'gold',
  'geekblue',
  'volcano',
];
const getExerciseTypeColor = (value: string) => {
  if (!value) return 'default';
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return typeColorMap[hash % typeColorMap.length];
};

// 计算月份统计数据（按运动类型分类，同一天同一类型多次记录算作一次）
const monthlyStats = computed(() => {
  // 使用Set来去重同一天同一类型的记录
  const dailyUniqueExercises = new Map<string, Set<string>>();

  tableData.value.forEach((row) => {
    if (row.exerciseDate) {
      try {
        // 使用日期和运动类型组合作为唯一键
        const dateTypeKey = `${row.exerciseDate}_${row.exerciseTypeId}`;

        // 如果还没有这个组合，则添加到集合中
        if (!dailyUniqueExercises.has(dateTypeKey)) {
          dailyUniqueExercises.set(dateTypeKey, new Set());
        }
        // 将记录ID添加到该日期类型组合的集合中
        dailyUniqueExercises.get(dateTypeKey)?.add(row.id);
      } catch (error) {
        console.warn('日期解析失败:', row.exerciseDate, error);
      }
    }
  });

  // 按月份和类型统计
  const monthlyData: Record<string, Record<string, number>> = {};

  // 遍历去重后的数据进行统计
  dailyUniqueExercises.forEach((_ids, dateTypeKey) => {
    const [dateStr, typeId] = dateTypeKey.split('_');
    const date = new Date(dateStr || '');

    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

      // 获取运动类型标签
      const typeLabel = getExerciseTypeLabel(typeId || '');

      // 初始化月份和类型的计数器
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }

      // 同一天同一类型算作一次
      if (!monthlyData[monthKey][typeLabel]) {
        monthlyData[monthKey][typeLabel] = 0;
      }
      monthlyData[monthKey][typeLabel] += 1;
    }
  });

  return monthlyData;
});

// 计算运动类型统计数据（求和：该类型的所有 exercise_count 之和）
const exerciseTypeStats = computed(() => {
  // 按运动类型分组，累加 exercise_count
  const typeData: Record<string, number> = {};

  tableData.value.forEach((row) => {
    if (row.exerciseTypeId) {
      const typeLabel = getExerciseTypeLabel(row.exerciseTypeId);
      typeData[typeLabel] =
        (typeData[typeLabel] || 0) + (Number(row.exerciseCount) || 0);
    }
  });

  const result = Object.entries(typeData).map(([name, value]) => ({
    name,
    value,
  }));
  return result;
});

// 计算总运动次数（去重：同一天同一类型算一次）
const totalExercise = computed(() => {
  const uniqueExercises = new Set<string>();

  tableData.value.forEach((row) => {
    if (row.exerciseDate && row.exerciseTypeId) {
      // 使用日期和运动类型组合作为唯一键
      const uniqueKey = `${row.exerciseDate}_${row.exerciseTypeId}`;
      uniqueExercises.add(uniqueKey);
    }
  });

  return uniqueExercises.size;
});

// 计算按天统计数据（支持按运动类型筛选）
const dailyStats = computed(() => {
  // 使用Map来统计每天的运动数量
  const dailyData = new Map<string, number>();

  tableData.value.forEach((row) => {
    if (row.exerciseDate) {
      // 如果选择了特定运动类型，只统计该类型
      if (
        selectedExerciseType.value &&
        row.exerciseTypeId !== selectedExerciseType.value
      ) {
        return;
      }

      const dateStr = row.exerciseDate;
      const currentCount = dailyData.get(dateStr) || 0;
      dailyData.set(dateStr, currentCount + (Number(row.exerciseCount) || 0));
    }
  });

  // 按日期排序并转换为数组
  const sortedEntries = Array.from(dailyData.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return {
    dates: sortedEntries.map(([date]) => date),
    counts: sortedEntries.map(([, count]) => count),
  };
});

// 更新图表
const updateCharts = () => {
  const monthlyData = monthlyStats.value;
  const typeData = exerciseTypeStats.value;

  // 检查是否有数据
  if (Object.keys(monthlyData).length === 0 || typeData.length === 0) {
    return;
  }

  // 获取所有唯一的运动类型
  const allTypes = [
    ...new Set(
      Object.values(monthlyData).flatMap((month) => Object.keys(month)),
    ),
  ];

  // 准备柱状图数据，按类型分组
  const monthKeys = Object.keys(monthlyData).sort();

  // 计算每月总计
  const monthlyTotals = monthKeys.map((monthKey) => {
    let total = 0;
    Object.values(monthlyData[monthKey] || {}).forEach((count) => {
      total += count;
    });
    return total;
  });

  const seriesData = allTypes.map((type) => {
    return {
      name: type,
      type: 'bar',
      stack: '总量', // 堆叠显示
      data: monthKeys.map((monthKey) => {
        return monthlyData[monthKey]?.[type] || 0;
      }),
      label: {
        show: true,
        position: 'insideTop',
        formatter: (params: any) => {
          return params.value > 0 ? params.value : '';
        },
        fontSize: 10,
        color: '#fff',
      },
      emphasis: {
        focus: 'series',
      },
    };
  });

  // 添加一个系列显示每月总数（放在柱子顶部）
  seriesData.push({
    name: '本月合计',
    type: 'bar',
    data: monthlyTotals,
    barGap: '-100%', // 覆盖在柱子顶部
    z: 10,
    label: {
      show: true,
      position: 'top',
      formatter: (params: any) => {
        return params.value > 0 ? `${params.value}` : '';
      },
      fontSize: 12,
      color: '#666',
    },
    itemStyle: {
      color: 'transparent', // 透明柱子，只显示label
    },
    emphasis: {
      disabled: true,
    } as any,
  } as any);

  // 渲染柱状图（按类型分类显示）
  renderLineChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const month = params[0].name;
        let result = `<div style="font-weight:bold;margin-bottom:5px;">${month}</div>`;
        let total = 0;
        // 按值排序，大的显示在前面
        const sortedParams = [...params].sort((a, b) => b.value - a.value);
        sortedParams.forEach((item: any) => {
          // 排除本月合计这个透明系列
          if (item.seriesName !== '本月合计' && item.value > 0) {
            result += `<div style="display:flex;align-items:center;gap:4px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};"></span>
              <span style="flex:1;">${item.seriesName}:</span>
              <span style="font-weight:bold;">${item.value}次</span>
            </div>`;
            total += item.value;
          }
        });
        result += `<div style="border-top:1px solid #eee;margin-top:5px;padding-top:5px;font-weight:bold;">
          本月合计: ${total}次
        </div>`;
        return result;
      },
    },
    legend: {
      data: allTypes,
      top: '5%',
      type: 'scroll',
      orient: 'horizontal',
    },
    // 添加数据缩放功能
    dataZoom:
      monthKeys.length > 6
        ? [
            {
              type: 'slider',
              show: true,
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
              borderColor: 'transparent',
              backgroundColor: '#f5f5f5',
              fillerColor: 'rgba(78, 205, 196, 0.2)',
              handleStyle: {
                color: '#4ecdc4',
              },
              textStyle: {
                color: '#666',
              },
            },
            {
              type: 'inside',
              start: 0,
              end: 100,
            },
          ]
        : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: monthKeys.length > 6 ? 40 : 10,
      top: 60,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: monthKeys,
      axisLabel: {
        rotate: 45,
        interval: isMobile.value ? 0 : 'auto',
      },
    },
    yAxis: {
      type: 'value',
      name: '运动次数',
      axisLabel: {
        formatter: '{value}次',
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    series: seriesData as any,
  });

  // 渲染饼图
  renderPieChart({
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: isMobile.value
      ? {
          orient: 'horizontal',
          bottom: '0',
          left: 'center',
        }
      : {
          orient: 'vertical',
          right: 10,
          top: 'center',
        },
    series: [
      {
        name: '运动类型分布',
        type: 'pie',
        radius: isMobile.value ? ['0%', '55%'] : ['0%', '80%'],
        center: isMobile.value ? ['50%', '45%'] : ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderWidth: 2,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            return `${params.name}\n${params.value}次 (${params.percent}%)`;
          },
          fontSize: 12,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10,
        },
        data: typeData,
      },
    ],
  });
};

// 监听设备变化，重新渲染图表和调整表格
watch(isMobile, () => {
  setTimeout(() => {
    updateCharts();
    updateDailyChart();
    updateColumnsVisibility();
  }, 200);
});

// 监听运动类型筛选变化，更新按天统计图表
watch(selectedExerciseType, () => {
  setTimeout(() => {
    updateDailyChart();
  }, 100);
});

// 更新按天统计图表
const updateDailyChart = () => {
  const dailyData = dailyStats.value;

  // 检查是否有数据
  if (dailyData.dates.length === 0) {
    return;
  }

  // 渲染按天统计柱状图
  renderDailyChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `<div style="font-weight:bold;margin-bottom:5px;">${data.name}</div>
                <div style="display:flex;align-items:center;gap:4px;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${data.color};"></span>
                  <span>运动量:</span>
                  <span style="font-weight:bold;">${data.value}</span>
                </div>`;
      },
    },
    dataZoom:
      dailyData.dates.length > 14
        ? [
            {
              type: 'slider',
              show: true,
              start: 0,
              end: 100,
              height: 20,
              bottom: 10,
              borderColor: 'transparent',
              backgroundColor: '#f5f5f5',
              fillerColor: 'rgba(78, 205, 196, 0.2)',
              handleStyle: {
                color: '#4ecdc4',
              },
              textStyle: {
                color: '#666',
              },
            },
            {
              type: 'inside',
              start: 0,
              end: 100,
            },
          ]
        : undefined,
    grid: {
      left: '3%',
      right: '4%',
      bottom: dailyData.dates.length > 14 ? 40 : 10,
      top: 30,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dailyData.dates,
      axisLabel: {
        rotate: 45,
        interval: isMobile.value ? 0 : 'auto',
        formatter: (value: string) => {
          // 只显示月-日
          return value.slice(5);
        },
      },
    },
    yAxis: {
      type: 'value',
      name: '运动量',
      axisLabel: {
        formatter: '{value}',
      },
      splitLine: {
        lineStyle: {
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: dailyData.counts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#4ecdc4' },
              { offset: 1, color: '#26a69a' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            return params.value > 0 ? `${params.value}` : '';
          },
          fontSize: 10,
          color: '#666',
        },
      },
    ],
  });
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadExerciseTypes();
  // 加载统计数据用于统计图表
  loadStatisticsData();
  // 延迟调整列显隐，确保 Grid 已初始化
  setTimeout(() => {
    updateColumnsVisibility();
  }, 500);
});

// 加载统计数据用于统计图表（带默认时间限制）
const loadStatisticsData = async () => {
  try {
    // 使用新的 statistics 接口获取统计数据用于统计，默认限制时间为最近一年
    const result = await getStatistics({});
    if (result) {
      tableData.value = result;
      // 使用 setTimeout 确保 DOM 完全渲染后再更新图表
      setTimeout(() => {
        updateCharts();
        updateDailyChart();
      }, 100);
    }
  } catch (error) {
    console.error('加载运动统计数据失败:', error);
  }
};

// 监听筛选条件变化，重新加载统计图表数据
const reloadStatsData = async (formValues: any) => {
  try {
    // 处理查询条件
    const processedCondition = processQueryCondition(formValues);
    const result = await getStatistics(processedCondition);
    if (result) {
      tableData.value = result;
      // 使用 setTimeout 确保 DOM 完全渲染后再更新图表
      setTimeout(() => {
        updateCharts();
        updateDailyChart();
      }, 100);
    }
  } catch (error) {
    console.error('加载筛选后的统计数据失败:', error);
  }
};

// 模态框相关
const modalVisible = ref(false);
const currentRow = ref<any>(null);

const openFormModal = (row?: any) => {
  currentRow.value = row;
  modalVisible.value = true;
};

const closeFormModal = () => {
  modalVisible.value = false;
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
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
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
  submitOnChange: true,
  // 按下回车时提交表单
  submitOnEnter: true,
};

// ...

const handleCellClick = (params: any) => {
  // 如果是手机端
  if (
    isMobile.value && // 只有点击数据列才触发编辑
    ['exerciseCount', 'exerciseDate', 'exerciseTypeId'].includes(
      params.column.field,
    )
  ) {
    openFormModal(params.row);
  }
};

const gridOptions: VxeGridProps<RowType> = {
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  maxHeight: 600, // 表格最大高度
  size: 'medium',
  checkboxConfig: {
    isShiftKey: true,
  },
  // 添加事件监听
  rowConfig: {
    isHover: true,
    isCurrent: true,
    height: 52,
  },
  cellConfig: {
    padding: true,
  },
  // 显示表尾合计行
  showFooter: true,
  footerMethod: ({ columns, data }) => {
    const footerData = columns.map((column) => {
      if (column.field === 'exerciseCount') {
        const total = data.reduce(
          (sum, row) => sum + (Number(row.exerciseCount) || 0),
          0,
        );
        return total;
      }
      if (column.field === 'exerciseTypeId') {
        return '合计';
      }
      return '';
    });
    return [footerData];
  },
  columns: [
    { type: 'checkbox', title: '', width: 50, fixed: 'left' },
    {
      title: '序号',
      type: 'seq',
      width: 80,
      fixed: 'left',
      visible: !isMobile.value,
    },
    { title: '主键', visible: false },
    {
      field: 'exerciseDate',
      title: '运动日期',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'exerciseTypeId',
      title: '运动类型',
      sortable: true,
      headerAlign: 'center',
      align: 'center',
      slots: { default: 'exerciseType' },
    },
    {
      field: 'exerciseCount',
      title: '数量',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      className: 'col-count',
      slots: { default: 'exerciseCount' },
    },
    {
      field: 'description',
      title: '备注',
      headerAlign: 'center',
      align: 'left',
      showOverflow: 'tooltip',
    },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 130,
      align: 'center',
      visible: !isMobile.value,
    },
    {
      field: 'mobileCard',
      title: '详情',
      visible: false,
      slots: { default: 'mobile-card' },
      width: '100%',
      showOverflow: false,
      className: 'mobile-card-col',
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
          // 表格显示分页数据
          // 同时调用 getStatistics 获取统计数据用于统计图表
          await reloadStatsData(formValues);
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
const openAddFormModal = () => {
  openFormModal();
};

const submitDeleteData = async () => {
  const checkboxRecords = gridApi.grid.getCheckboxRecords();
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

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  gridEvents: {
    cellClick: handleCellClick,
    // vxe-table 不直接支持 rowTouchStart 事件，需要通过 cell-mouseenter 等间接方式或者自定义事件
    // 但 vxe-grid 组件支持 v-on 绑定所有 vxe-table 事件
  },
} as any);

const updateColumnsVisibility = () => {
  if (!gridApi?.grid) return;

  const mobile = isMobile.value;
  // 手机端隐藏表头、边框、斑马纹，清除最大高度
  gridApi.setState({
    gridOptions: {
      showHeader: true, // 手机端也显示表头
      border: !mobile, // 手机端不显示边框，保持简洁
      stripe: !mobile,
      maxHeight: mobile ? 800 : 800,
      size: mobile ? 'mini' : 'small', // 手机端使用更紧凑的尺寸
      rowClassName: mobile ? 'mobile-row' : '',
    },
  });

  // 获取所有列配置
  const { fullColumn } = gridApi.grid.getTableColumn();

  fullColumn.forEach((col) => {
    // 手机端不显示 mobileCard，而是显示精简的表格列
    if (col.field === 'mobileCard') {
      col.visible = false;
    } else if (
      ['exerciseCount', 'exerciseDate', 'exerciseTypeId', 'description'].includes(
        col.field,
      )
    ) {
      col.visible = true;
      // 手机端自动调整宽度
      if (mobile) {
        if (col.field === 'exerciseDate') {
          col.width = 110;
        } else if (col.field === 'exerciseTypeId') {
          col.width = 'auto';
        } else if (col.field === 'exerciseCount') {
          col.width = 90;
        } else {
          col.minWidth = 100;
        }
      }
    } else if (col.field === 'action') {
      // 手机端隐藏操作列以节省空间
      col.visible = !mobile;
    } else if (col.type === 'checkbox' || col.type === 'seq') {
      // 手机端隐藏复选框、序号列
      col.visible = !mobile;
    } else {
      // 隐藏其他所有列
      col.visible = !mobile;
    }
  });

  gridApi.grid.refreshColumn();
};

const deleteRow = async (row: RowType) => {
  try {
    await deleteBatch({
      idList: [row.id],
    }).then(() => gridApi.reload());
  } catch (error) {
    console.error('捕获异常：', error);
  }
};

// 处理查询条件，将日期区间转换为开始时间和结束时间
const processQueryCondition = (formValues: any) => {
  const condition = { ...formValues };
  // 处理日期区间
  if (
    condition.exerciseDateRange &&
    Array.isArray(condition.exerciseDateRange)
  ) {
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
  <div class="vp-raw exercise-wrapper w-full">
    <!-- 图表区域 -->
    <div class="charts-section">
      <!-- 总运动次数卡片 -->
      <div class="total-card">
        <div class="total-content">
          <div class="total-info">
            <div class="total-label">总运动次数</div>
            <div class="total-amount">{{ totalExercise }}次</div>
          </div>
        </div>
      </div>

      <!-- 图表容器 -->
      <div class="chart-container">
        <Card class="chart-item">
          <EchartsUI ref="lineChartRef" style="width: 100%; height: 300px" />
        </Card>
        <Card class="chart-item">
          <EchartsUI ref="pieChartRef" style="width: 100%; height: 300px" />
        </Card>
      </div>

      <!-- 按天统计图表 -->
      <Card class="daily-chart-card" title="每日运动统计">
        <template #extra>
          <Select
            v-model:value="selectedExerciseType"
            placeholder="全部运动类型"
            allow-clear
            style="width: 180px"
            :options="dictOptions"
            :field-names="{ label: 'label', value: 'value' }"
          />
        </template>
        <EchartsUI ref="dailyChartRef" style="width: 100%; height: 300px" />
      </Card>
    </div>

    <!-- 表格区域 -->
    <Card class="table-card" title="运动记录" :bordered="false">
      <Grid>
        <template #toolbar-tools>
          <Button class="mr-2" type="primary" @click="openAddFormModal">
            新增
          </Button>
          <Popconfirm
            title="确认删除选中的记录吗?"
            ok-text="确定"
            cancel-text="取消"
            @confirm="submitDeleteData"
          >
            <Button class="mr-2" type="primary" danger> 删除 </Button>
          </Popconfirm>
        </template>
        <template #action="{ row }">
          <Button type="link" size="small" @click="openFormModal(row)">
            <template #icon><EditOutlined /></template>
          </Button>
          <Popconfirm
            title="是否确认删除?"
            ok-text="是"
            cancel-text="否"
            @confirm="deleteRow(row)"
          >
            <Button type="link" size="small" danger>
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Popconfirm>
        </template>
        <template #exerciseType="{ row }">
          <Tag :color="getExerciseTypeColor(row.exerciseTypeId)" class="type-tag">
            {{ getExerciseTypeLabel(row.exerciseTypeId) }}
          </Tag>
        </template>
        <template #exerciseCount="{ row }">
          <span class="count-cell">{{ row.exerciseCount }}</span>
        </template>
        <template #mobile-card="{ row }">
          <div class="mobile-card-item">
            <div class="card-header">
              <span class="card-title">{{
                getExerciseTypeLabel(row.exerciseTypeId)
              }}</span>
              <span class="card-date">{{ row.exerciseDate }}</span>
            </div>
            <div class="card-body">
              <div class="card-row" v-if="row.description">
                <span class="label">备注:</span>
                <span class="value">{{ row.description }}</span>
              </div>
            </div>
            <div class="card-footer">
              <Button size="small" type="link" @click="openFormModal(row)">
                <template #icon><EditOutlined /></template>
              </Button>
              <Popconfirm
                title="是否确认删除?"
                ok-text="是"
                cancel-text="否"
                @confirm="deleteRow(row)"
              >
                <Button size="small" type="link" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Popconfirm>
            </div>
          </div>
        </template>
      </Grid>
    </Card>

    <!-- 表单模态框 -->
    <Modal
      v-model:open="modalVisible"
      :title="currentRow ? '编辑运动记录' : '新增运动记录'"
      :width="isMobile ? '90%' : 600"
      :footer="null"
      :destroy-on-close="true"
    >
      <FormDrawerDemo
        :values="currentRow"
        @table-reload="tableReload"
        @close="closeFormModal"
      />
    </Modal>
  </div>
</template>

<style scoped>
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
  .total-amount {
    font-size: 24px;
  }

  .table-card :deep(.ant-card-body) {
    padding: 8px;
  }

  .table-card :deep(.ant-card-head-title) {
    font-size: 14px;
  }

  .daily-chart-card :deep(.ant-card-head-wrapper) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .daily-chart-card :deep(.ant-card-extra) {
    width: 100%;
  }

  .daily-chart-card :deep(.ant-select) {
    width: 100% !important;
  }
}

.exercise-wrapper {
  padding: 12px;
}

.charts-section {
  padding: 0;
  margin-bottom: 12px;
}

.table-card {
  border-radius: 10px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 4%);
}

.table-card :deep(.ant-card-head) {
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
}

.table-card :deep(.ant-card-head-title) {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.table-card :deep(.ant-card-body) {
  padding: 12px 16px 16px;
}

.table-card :deep(.vxe-table) {
  font-size: 14px;
}

.table-card :deep(.vxe-table--render-wrapper),
.table-card :deep(.vxe-table--main-wrapper) {
  width: 100%;
}

.table-card :deep(.vxe-table-vars) {
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.table-card :deep(.vxe-table-vars) {
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.table-card :deep(.vxe-header--column) {
  height: 44px;
  padding: 0 12px;
  font-weight: 600;
  color: #262626;
  background-color: #fafafa !important;
  border-bottom: 1px solid #e8e8e8;
}

.table-card :deep(.vxe-body--column) {
  padding: 0 12px;
}

.count-cell {
  display: inline-block;
  width: 100%;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1f1f1f;
  text-align: right;
}

.table-card :deep(.col-count) {
  padding-right: 8px !important;
  padding-left: 4px !important;
}

.table-card :deep(.vxe-body--row:hover) {
  background-color: #f0f9ff !important;
}

.table-card :deep(.vxe-body--row.row--current) {
  background-color: #e6f4ff !important;
}

.table-card :deep(.vxe-footer--column) {
  height: 44px;
  padding: 0 12px;
  font-weight: 600;
  color: #1f1f1f;
  background-color: #fafafa !important;
  border-top: 1px solid #e8e8e8;
}

.table-card :deep(.vxe-footer--column.col--seq),
.table-card :deep(.vxe-footer--column.col--checkbox) {
  background-color: #fafafa !important;
}

.type-tag {
  margin: 0;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 10px;
}

:deep(.mobile-card-col) {
  padding: 0 !important;
  background-color: transparent !important;
}

:deep(.mobile-row) {
  background-color: transparent !important;
}

:deep(.mobile-row .vxe-body--column) {
  height: 48px !important;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* 隐藏移动端的排序图标以节省空间，或者保留但变小 */
:deep(.mobile-row .vxe-cell--sort) {
  display: none;
}

.total-card {
  padding: 12px;
  margin-bottom: 12px;
  color: white;
  background: linear-gradient(135deg, #4ecdc4 0%, #26a69a 100%);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgb(78 205 196 / 30%);
}

.total-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.total-info {
  flex: 1;
}

.total-label {
  margin-bottom: 8px;
  font-size: 16px;
  opacity: 0.9;
}

.total-amount {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.chart-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  height: 350px;
}

.chart-item {
  min-width: 0; /* 防止 grid item 溢出 */
  overflow: hidden;

  /* background: #fff; */
  border-radius: 8px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
}

.chart-item :deep(.ant-card-body) {
  height: 100%;
  padding: 12px;
}

.chart-item :deep(.echarts-ui) {
  height: 300px;
}

.daily-chart-card {
  margin-top: 12px;
  border-radius: 8px;
}

.daily-chart-card :deep(.ant-card-head) {
  min-height: 48px;
}

.daily-chart-card :deep(.ant-card-head-wrapper) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.daily-chart-card :deep(.ant-card-extra) {
  margin: 0;
}

.daily-chart-card :deep(.ant-card-body) {
  padding: 12px;
}

.mobile-card-item {
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.card-date {
  font-size: 12px;
  color: #999;
}

.card-body {
  margin-bottom: 8px;
}

.card-row {
  display: flex;
  margin-bottom: 4px;
  font-size: 14px;
}

.card-row .label {
  flex-shrink: 0;
  width: 50px;
  color: #666;
}

.card-row .value {
  flex: 1;
  color: #333;
}

.card-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}
</style>
