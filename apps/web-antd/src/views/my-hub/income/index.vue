<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { deleteData, query } from '#/api/core/income';

import IncomeDashboard from './components/IncomeDashboard.vue';
import FormModalDemo from './form-modal.vue';

interface RowType {
  incomeId: number | string;
  amt: number;
  remark: string;
  incTypeId: number;
  incDate: string;
  updateTime: string;
}

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

// 跟踪选中的年份
const selectedYear = ref<number | 'all'>('all');

const loadIncomeTypes = async () => {
  try {
    const res = await getByDictType('income_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载收入类型失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: number) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find((item) => item.id === value);
  return option ? option.label : String(value);
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadIncomeTypes();
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    // 搜索
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择收入类型',
        options: dictOptions, // 绑定收入类型选项
        allowClear: true, // 添加清除选项功能
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'incTypeId', // 修改为按收入类型查询
      label: '收入类型',
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  // 是否在字段值改变时提交表单
  submitOnChange: true,
  // 按下回车时是否提交表单
  submitOnEnter: true,
};

const gridOptions: VxeGridProps<RowType> = {
  checkboxConfig: {
    highlight: true,
    labelField: 'name',
  },
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  maxHeight: 1000, // 直接在根级别配置表格最大高度，解决vxe-table缺少高度参数的警告
  columns: [
    { title: '序号', type: 'seq', width: 50 },
    { title: '主键', visible: false },
    {
      field: 'amt',
      cellType: 'number',
      title: '金额',
      minWidth: 100,
      sortable: true,
      align: 'right',
      formatter: ({ cellValue }) => {
        return cellValue.toFixed(2);
      },
    },
    { field: 'remark', title: '备注', sortable: true, minWidth: 150 },
    {
      field: 'incTypeId',
      title: '收入类型',
      minWidth: 100,
      sortable: true,
      formatter: ({ cellValue }) => {
        return getIncomeTypeLabel(cellValue);
      },
    },
    { field: 'incDate', title: '时间', sortable: true, minWidth: 120 },
    { field: 'updateTime', title: '修改时间', sortable: true, minWidth: 160 },
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
      if (!field) return;
      if (field === 'amt') {
        const total = data.reduce((prev, row) => {
          const value = row[field as keyof RowType];
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
    pageSize: 200,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadIncomeTypes();
        return await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: {
            ...formValues,
            // 添加年份条件，当选择"全部"时不传递year参数
            ...(selectedYear.value !== 'all' ? { year: selectedYear.value } : {}),
          },
        });
      },
    },
  },
  toolbarConfig: {
    // 是否显示搜索表单控制按钮
    // @ts-ignore 正式环境时有完整的类型声明
    search: true,
  },
};

function openFormModal(row: RowType) {
  formModalApi
    .setData({
      // 表单值
      values: row,
    })
    .open();
}

function openAddFormModal() {
  formModalApi
    .setData({
      // 表单值
      values: {},
    })
    .open();
}

const dashboardRef = ref<InstanceType<typeof IncomeDashboard>>();

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      incomeId: row.incomeId,
    });
    await gridApi.reload();
    // 刷新看板数据
    if (dashboardRef.value) {
      await dashboardRef.value.refreshData();
    }
  } catch (error) {
    console.error('捕获异常：', error);
  }
};

// 处理年份变化
const handleYearChange = async (year: number | 'all') => {
  selectedYear.value = year;
  // 只刷新表格，不刷新看板，避免重复刷新
  await gridApi.reload();
};

const tableReload = async () => {
  await gridApi.reload();
  // 刷新看板数据，但只在非年份选择触发时调用
  if (dashboardRef.value) {
    await dashboardRef.value.refreshData();
  }
};
</script>

<template>
  <div class="vp-raw w-full">
    <FormModal @table-reload="tableReload" />
    <!-- 收入看板 -->
    <IncomeDashboard ref="dashboardRef" @year-change="handleYearChange" />
    <!-- 收入列表 -->
    <Grid>
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="openAddFormModal">
          新增
        </Button>
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
    </Grid>
  </div>
</template>
