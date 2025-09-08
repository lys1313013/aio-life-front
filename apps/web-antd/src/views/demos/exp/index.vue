<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteData, query } from '#/api/core/sysDictType';

import FormDrawerDemo from './form-drawer.vue';

interface RowType {
  dictId: any;
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
    { field: 'dictName', title: '字典名称', sortable: true },
    { field: 'dictType', title: '字典标识', sortable: true },
    { field: 'remark', title: '备注', sortable: true },
    { field: 'updateTime', title: '修改时间', sortable: true },

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
      dictId: row.dictId,
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
