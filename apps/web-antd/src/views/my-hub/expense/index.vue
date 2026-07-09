<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import { ColumnWidthOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteBatch, deleteData, query } from '#/api/core/expense';
import { getByDictType } from '#/api/core/userDictType';

import TransactionDashboard from '../components/TransactionDashboard.vue';
import FormModalDemo from './form-modal.vue';

interface RowType {
  id: any;
  category: string;
  color: string;
  price: string;
  productName: string;
  releaseDate: string;
  amt: number;
  expTypeId: number;
  payTypeId: string;
  remark: string;
  expTime: string;
  expDesc: string;
  counterparty: string;
  transactionId: string;
  createTime: string;
  updateTime: string;
}

const dashboardRef = ref<InstanceType<typeof TransactionDashboard>>();

const { isMobile } = usePreferences();

const dictOptions = ref<Array<any>>([]);
const payTypeOptions = ref<Array<any>>([]);
const tableData = ref<RowType[]>([]);

const loadExpTypes = async () => {
  try {
    const res = await getByDictType('exp_type');
    dictOptions.value = res.dictDetailList.map((item) => ({
      ...item,
      label: item.dictLabel || item.label,
      value: item.dictValue || item.value,
    }));
  } catch (error) {
    console.error('加载类型失败:', error);
  }
};

const loadPayTypes = async () => {
  try {
    const res = await getByDictType('pay_type');
    payTypeOptions.value = res.dictDetailList.map((item) => ({
      ...item,
      label: item.dictLabel || item.label,
      value: item.dictValue || item.value,
    }));
  } catch (error) {
    console.error('加载支付方式失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: any) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find(
    (item) => String(item.id) === String(value),
  );
  return option ? option.label : String(value);
};

// 获取支付方式标签
const getPayTypeLabel = (value: any) => {
  const option = payTypeOptions.value.find(
    (item) => String(item.id) === String(value),
  );
  return option ? option.label : String(value);
};

// 在组件挂载时加载值集数据
onMounted(async () => {
  await loadExpTypes();
  await loadPayTypes();
});

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalDemo,
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
    {
      field: 'payTypeId',
      title: '支付方式',
      sortable: true,
      width: 100,
      formatter: ({ cellValue }) => {
        return getPayTypeLabel(cellValue);
      },
    },
    { field: 'remark', title: '备注', sortable: true, width: 100 },
    { field: 'expTime', title: '时间', sortable: true, width: 180 },
    { field: 'expDesc', title: '交易描述', sortable: true, width: 200 },
    { field: 'counterparty', title: '交易对方', sortable: true, width: 150 },
    { field: 'transactionId', title: '交易号', sortable: true, width: 200 },
    {
      field: 'transactionStatus',
      title: '交易状态',
      sortable: true,
      width: 200,
    },
    {
      field: 'merchantOrderNo',
      title: '商家订单号',
      sortable: true,
      width: 200,
    },
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
          if (dashboardRef.value) {
            await dashboardRef.value.refreshData();
          }
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
    // 隐藏默认列配置按钮，使用自定义按钮
    custom: false,
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
      values: { modelname: '' },
    })
    .open();
}

function submitDeleteData() {
  const checkboxRecords = gridApi.grid.getCheckboxRecords();
  console.log('checkboxRecords:', checkboxRecords);
  deleteBatch({
    idList: checkboxRecords.map((item) => item.id),
  }).then(() => gridApi.reload());
}

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions } as any);

const openColumnConfig = () => {
  gridApi.grid?.openCustom();
};

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
      condition.startTime = startTime.includes(' ')
        ? startTime
        : `${startTime} 00:00:00`;
    }
    if (endTime) {
      // 确保结束时间包含完整的时间部分
      condition.endTime = endTime.includes(' ')
        ? endTime
        : `${endTime} 23:59:59`;
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
  if (dashboardRef.value) {
    await dashboardRef.value.refreshData();
  }
};

const handleMonthSelect = (payload: {
  endDate: string;
  monthStr: string;
  startDate: string;
}) => {
  message.success(`已选择月份: ${payload.monthStr}`);
  if (gridApi && gridApi.formApi) {
    gridApi.formApi.setValues({
      expTimeRange: [payload.startDate, payload.endDate],
    });
  }
};

const handleYearChange = (_year: 'all' | number) => {
  // dashboard内部已处理
};
</script>

<template>
  <div class="vp-raw w-full">
    <FormModal
      @table-reload="tableReload"
      @update-success="handleUpdateSuccess"
    />

    <!-- 支出看板 -->
    <TransactionDashboard
      ref="dashboardRef"
      type="expense"
      @month-select="handleMonthSelect"
      @year-change="handleYearChange"
    />
    <!-- 表格区域 -->
    <Grid>
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="openAddFormModal">
          新增
        </Button>
        <Button class="mr-2" type="primary" @click="submitDeleteData">
          删除
        </Button>
        <Button class="ml-auto" type="text" @click="openColumnConfig">
          <ColumnWidthOutlined />
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

<style scoped></style>
