<script lang="ts" setup>
import { onMounted, ref, h } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteData, query } from '#/api/core/userDictData';
import { Button, message, Popconfirm, Tag } from 'ant-design-vue';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { Icon } from '@iconify/vue';
import type { VxeGridProps } from '#/adapter/vxe-table';

import FormModalDemo from './form-modal.vue';

interface RowType {
  id: string;
  dictLabel: string;
  dictValue: string;
  icon: string;
  color: string;
  dictSort: number;
  status: number;
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: FormModalDemo,
});

const gridOptions: VxeGridProps<RowType> = {
  border: true,
  stripe: true,
  maxHeight: 800,
  columns: [
    { title: '序号', type: 'seq', width: 50 },
    { 
      field: 'icon', 
      title: '图标', 
      width: 80, 
      align: 'center',
      slots: { default: 'icon' },
    },
    { 
      field: 'color', 
      title: '颜色', 
      width: 100,
      slots: { default: 'color' },
    },
    { field: 'dictLabel', title: '名称', sortable: true, width: 150 },
    { field: 'dictValue', title: '标识', sortable: true, width: 150 },
    { field: 'dictSort', title: '排序', sortable: true, width: 80 },
    { 
      field: 'status', 
      title: '状态', 
      width: 80,
      formatter: ({ cellValue }) => {
        return cellValue === 1 ? '正常' : '停用';
      }
    },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ],
  pagerConfig: {
    pageSize: 50,
    pageSizes: [10, 20, 30, 50, 100],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const result = await query({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: {
            ...formValues,
            dictType: 'exercise_type',
          },
        });
        return result;
      },
    },
  },
  toolbarConfig: {
    search: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ 
  gridOptions,
  formOptions: {
    schema: [
      {
        component: 'Input',
        fieldName: 'dictLabel',
        label: '名称',
      },
      {
        component: 'Input',
        fieldName: 'dictValue',
        label: '标识',
      },
    ],
    showCollapseButton: false,
    submitOnChange: true,
    submitOnEnter: true,
  }
} as any);

function openFormModal(row?: RowType) {
  formModalApi
    .setData({
      values: row || { status: 1, dictSort: 0 },
    })
    .open();
}

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      idList: [row.id],
    });
    message.success('删除成功');
    gridApi.reload();
  } catch (error) {
    console.error('删除异常：', error);
  }
};

const tableReload = () => {
  gridApi.reload();
};
</script>

<template>
  <div class="vp-raw w-full p-4">
    <FormModal @update-success="tableReload" />

    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="() => openFormModal()">
          <template #icon><PlusOutlined /></template>
          新增
        </Button>
      </template>

      <template #icon="{ row }">
        <Icon v-if="row.icon" :icon="row.icon" class="text-xl inline-block" />
        <span v-else>-</span>
      </template>

      <template #color="{ row }">
        <Tag v-if="row.color" :color="row.color">{{ row.color }}</Tag>
        <span v-else>-</span>
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
