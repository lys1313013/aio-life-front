<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';

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
}

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

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
  // 按下回车时是否提交表单
  submitOnEnter: true,
};

const gridOptions: VxeGridProps<RowType> = {
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
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
    pageSizes: [10, 20, 30, 50, 100, 200, 1000],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        await loadExpTypes();
        const newVar = await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: {
            ...formValues,
          },
        });
        return newVar;
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

const tableReload = () => {
  gridApi.reload();
};
</script>

<template>
  <div class="vp-raw w-full">
    <FormDrawer @table-reload="tableReload" />
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
        <a href="#" @click="openFormDrawer(row)">编辑</a>
        &nbsp;&nbsp;
        <Popconfirm
          title="是否确认删除?"
          ok-text="是"
          cancel-text="否"
          @confirm="deleteRow(row)"
        >
          <a href="#">删除</a>
        </Popconfirm>
      </template>
    </Grid>
  </div>
</template>
