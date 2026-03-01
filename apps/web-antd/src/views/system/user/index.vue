<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { useVbenModal } from '@vben/common-ui';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import { Button, Popconfirm, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getUserListApi, deleteUserApi } from '#/api/system/user';

import FormModal from './form-modal.vue';

interface RowType {
  id: number;
  username: string;
  nickname: string;
  role: string;
  email: string;
  createTime: string;
}

const [FormModalComponent, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
});

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入用户名/昵称',
      },
      fieldName: 'keyword',
      label: '关键词',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
};

const gridOptions: VxeGridProps<RowType> = {
  checkboxConfig: {
    highlight: true,
    labelField: 'username',
  },
  columns: [
    { title: 'ID', field: 'id', width: 80 },
    { field: 'username', title: '用户名' },
    { field: 'nickname', title: '昵称' },
    { field: 'role', title: '角色' },
    { field: 'email', title: '邮箱' },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 150,
    },
  ],
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        const res = await getUserListApi({
          page: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        });
        return {
            items: res.items,
            total: res.total
        };
      },
    },
  },
  toolbarConfig: {
    search: true,
    custom: true,
    slots: {
        tools: 'toolbar-tools',
    }
  },
};

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

function openFormModal(row?: RowType) {
  formModalApi.setData({ values: row || {} }).open();
}

async function handleDelete(row: RowType) {
  try {
    await deleteUserApi(row.id);
    message.success('删除成功');
    gridApi.reload();
  } catch (error) {
    console.error(error);
  }
}

function handleReload() {
  gridApi.reload();
}
</script>

<template>
  <div class="p-4">
    <FormModalComponent @reload="handleReload" />
    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="openFormModal()">
          <PlusOutlined />
          新增用户
        </Button>
      </template>
      <template #action="{ row }">
        <Button type="link" size="small" @click="openFormModal(row)">
          <EditOutlined />
        </Button>
        <Popconfirm
          title="确认删除该用户吗？"
          @confirm="handleDelete(row)"
        >
          <Button type="link" size="small" danger>
            <DeleteOutlined />
          </Button>
        </Popconfirm>
      </template>
    </Grid>
  </div>
</template>
