<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteData, query } from '#/api/core/performance';

import FormDrawerDemo from './form-drawer-demo.vue';

interface RowType {
  id: any;
  category: string;
  color: string;
  price: string;
  productName: string;
  releaseDate: string;
}

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '',
      },
      fieldName: 'dictName',
      label: '字典名称',
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
    { field: 'performanceName', title: '演出名称', sortable: true },
    { field: 'performer', title: '演员', sortable: true },
    {
      field: 'performanceType',
      title: '演出类型',
      sortable: true,
      formatter: ({ cellValue }) => {
        return cellValue === '1' ? '演唱会' : cellValue === '2' ? '音乐节' : cellValue;
      }
    },
    { field: 'performanceDate', title: '演出日期', sortable: true },
    { field: 'venue', title: '演出地点', sortable: true },
    { field: 'city', title: '演出城市', sortable: true },
    {
      cellRender: { name: 'CellImage' },
      field: 'imageUrl',
      title: '封面',
      width: 130,
    },
    { field: 'ticketPrice', title: '票价', sortable: true },

    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ],
  keepSource: true,
  pagerConfig: { pageSize: 50 },
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
      id: row.id,
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
