<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteData, query } from '#/api/core/sysDictData';
import { query as queryDictType } from '#/api/core/sysDictType';

import FormDrawerDemo from './form-drawer-demo.vue';

interface RowType {
  category: string;
  color: string;
  dictCode: string;
  price: string;
  productName: string;
  releaseDate: string;
}

import { ref } from 'vue';

const dictOptions = ref<Array<{label: string, value: string}>>([]);

async function loadDictOptions() {
  try {
    const res = await queryDictType({});
    dictOptions.value = res.items.map((item: { dictName: string; dictId: string }) => ({
      label: item.dictName,
      value: item.dictId
    }));
    console.log('字典类型选项:', dictOptions.value);
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
}
import { onMounted } from 'vue';
onMounted(() => {
  loadDictOptions();
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    // 搜索区
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择字典类型',
        options: dictOptions, // 绑定字典类型选项
        allowClear: true, // 添加清除选项功能
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        fieldNames: { label: 'label', value: 'value' },
      },
      fieldName: 'dictId',
      label: '字典类型',
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  // 是否在字段值改变时提交表单
  submitOnChange: true, // 按下回车时是否提交表单
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
    { title: 'dictCode', visible: false },
    { field: 'dictName', title: '字典名称', sortable: true },
    { field: 'dictType', title: '字典标识', sortable: true },
    { field: 'dictValue', title: '实际值', sortable: true },
    { field: 'dictLabel', title: '展示值', sortable: true },
    { field: 'dictSort', title: '排序', sortable: true },
    { field: 'status', title: '状态', sortable: true },
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
      values: {  status: '0' },
    })
    .open();
}

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      dictCode: row.dictCode,
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
