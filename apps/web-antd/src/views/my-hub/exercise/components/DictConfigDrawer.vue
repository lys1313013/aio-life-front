<script lang="ts" setup>
import { ref, toRaw } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import {
  getUserDictConfigList,
  saveUserDictConfig,
  deleteUserDictConfig,
} from '#/api/core/user-dict';
import { Button, Table, Popconfirm, Tag, Tooltip, Switch, message } from 'ant-design-vue';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { createIconifyIcon } from '@vben/icons';

const dictType = ref('exercise_type');
const configList = ref<any[]>([]);
const loading = ref(false);

const columns = [
  { title: '标签', dataIndex: 'dictLabel', key: 'dictLabel' },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 60, align: 'center' },
  { title: '颜色', dataIndex: 'color', key: 'color', width: 80, align: 'center' },
  { title: '类型', dataIndex: 'isSystem', key: 'isSystem', width: 80 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 120, align: 'center' },
];

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getUserDictConfigList(dictType.value);
    configList.value = res || [];
  } finally {
    loading.value = false;
  }
};

const renderIcon = (iconName: string) => {
  if (!iconName) return null;
  return createIconifyIcon(iconName);
};

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'userDictId',
      label: 'ID',
      dependencies: { show: false, triggerFields: ['id'] },
    },
    {
      component: 'Input',
      fieldName: 'sysDictCode',
      label: 'SysID',
      dependencies: { show: false, triggerFields: ['id'] },
    },
    {
      component: 'Input',
      fieldName: 'dictLabel',
      label: '标签名称',
      rules: 'required',
    },
    {
      component: 'IconPicker',
      fieldName: 'icon',
      label: '图标',
    },
    {
      component: 'Input',
      componentProps: {
        type: 'color',
      },
      fieldName: 'color',
      label: '颜色',
    },
    {
      component: 'InputNumber',
      fieldName: 'dictSort',
      label: '排序',
      defaultValue: 0,
    },
  ],
  showDefaultActions: true,
  submitButtonOptions: { content: '保存' },
  handleSubmit: async (values) => {
    await saveUserDictConfig({ ...toRaw(values), dictType: dictType.value });
    message.success('保存成功');
    formVisible.value = false;
    loadData();
  },
  handleReset: () => {
    formVisible.value = false;
  },
});

const formVisible = ref(false);
const formTitle = ref('新增配置');

const handleAdd = () => {
  formTitle.value = '新增私有分类';
  formVisible.value = true;
  formApi.resetForm();
};

const handleEdit = (record: any) => {
  formTitle.value = record.isSystem ? '覆盖系统分类' : '编辑私有分类';
  formVisible.value = true;
  setTimeout(() => {
    formApi.setValues(record);
  }, 50);
};

const handleToggleStatus = async (record: any, checked: boolean) => {
  const newStatus = checked ? '0' : '1';
  await saveUserDictConfig({
    ...toRaw(record),
    dictType: dictType.value,
    status: newStatus,
  });
  message.success(checked ? '已启用' : '已隐藏');
  loadData();
};

const handleDelete = async (record: any) => {
  if (record.isSystem) {
    if (record.userDictId) {
      await deleteUserDictConfig(record.userDictId);
      message.success('已恢复系统默认设置');
      loadData();
    }
  } else {
    await deleteUserDictConfig(record.userDictId);
    message.success('删除成功');
    loadData();
  }
};

const [Drawer, drawerApi] = useVbenDrawer({
  title: '运动类型配置',
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      loadData();
    }
  },
});

</script>

<template>
  <Drawer>
    <div class="p-4" v-if="!formVisible">
      <div class="mb-4">
        <Button type="primary" @click="handleAdd">
          <template #icon><PlusOutlined /></template>
          新增私有类型
        </Button>
      </div>
      <Table
        :columns="columns"
        :data-source="configList"
        :loading="loading"
        :pagination="false"
        row-key="dictValue"
        size="middle"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'icon'">
            <component :is="renderIcon(record.icon)" v-if="record.icon" class="text-xl" :style="{ color: record.color }" />
          </template>
          <template v-else-if="column.key === 'color'">
            <div v-if="record.color" class="flex items-center justify-center">
              <div class="w-6 h-6 rounded border border-gray-200" :style="{ backgroundColor: record.color }"></div>
            </div>
          </template>
          <template v-else-if="column.key === 'isSystem'">
            <Tag :color="record.isSystem ? 'blue' : 'green'">
              {{ record.isSystem ? '系统' : '私有' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Switch
              :checked="record.status === '0'"
              @change="(checked) => handleToggleStatus(record, checked as boolean)"
              checked-children="显示"
              un-checked-children="隐藏"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <Tooltip title="编辑/覆盖">
              <Button type="link" size="small" @click="handleEdit(record)">
                <template #icon><EditOutlined /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              v-if="!record.isSystem || record.userDictId"
              :title="record.isSystem ? '是否恢复系统默认设置?' : '是否确认删除此私有类型?'"
              @confirm="handleDelete(record)"
            >
              <Tooltip :title="record.isSystem ? '恢复默认' : '删除'">
                <Button type="link" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Popconfirm>
          </template>
        </template>
      </Table>
    </div>
    
    <div class="p-4" v-else>
      <div class="mb-4 text-lg font-bold">{{ formTitle }}</div>
      <Form />
    </div>
  </Drawer>
</template>
