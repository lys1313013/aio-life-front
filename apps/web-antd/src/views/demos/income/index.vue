<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { deleteData, query } from '#/api/core/income';

import FormDrawerDemo from './form-drawer.vue';

interface RowType {
  dictId: any;
  category: string;
  color: string;
  price: string;
  productName: string;
  releaseDate: string;
}

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

const loadIncomeTypes = async () => {
  // const res = await getByDictType('income_type');
  // dictOptions.value = res.dictDetailList;
  // console.log('加载字典选项成功');
  // console.log(dictOptions.value);
  // 模拟数据
  dictOptions.value = [
    { label: '工资', value: '1' },
    { label: '公积金', value: '2' },
    { label: '年终奖', value: '3' },
    { label: '理财', value: '4' },
  ];
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: number | string) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find((item) => item.value === String(value));
  return option ? option.label : String(value);
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadIncomeTypes();
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择收入类型',
        options: dictOptions, // 绑定收入类型选项
        allowClear: true, // 添加清除选项功能
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
  submitOnChange: false,
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
  columns: [
    { title: '序号', type: 'seq', width: 50 },
    { title: '主键', visible: false },
    { field: 'amt', title: '金额', sortable: true },
    { field: 'remark', title: '备注', sortable: true },
    {
      field: 'incTypeId',
      title: '收入类型',
      sortable: true,
      formatter: ({ cellValue }) => {
        return getIncomeTypeLabel(cellValue);
      },
    },
    { field: 'incDate', title: '时间', sortable: true },
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
    pageSize: 200,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        return await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: {
            ...formValues,
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

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      incomeId: row.incomeId,
    });
    gridApi.reload();
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
