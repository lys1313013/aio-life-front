<script setup lang="ts">
import type { UserBindEntity } from '#/api/core/user-bind';

import { onMounted, ref } from 'vue';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Table,
} from 'ant-design-vue';

import {
  addUserBindApi,
  deleteUserBindApi,
  getUserBindListApi,
  updateUserBindApi,
} from '#/api/core/user-bind';

const columns = [
  { title: '平台', dataIndex: 'platform', key: 'platform' },
  {
    title: '账号/用户名',
    dataIndex: 'platformUsername',
    key: 'platformUsername',
  },
  { title: '绑定时间', dataIndex: 'createTime', key: 'createTime' },
  { title: '操作', key: 'action' },
];

const data = ref<UserBindEntity[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const modalLoading = ref(false);

const formState = ref<UserBindEntity>({
  platform: 'github',
  platformUsername: '',
  accessToken: '',
});

const platformOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'LeetCode', value: 'leetcode' },
  { label: '扇贝单词', value: 'shanbay' },
];

const fetchList = async () => {
  loading.value = true;
  try {
    data.value = await getUserBindListApi();
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  formState.value = {
    platform: 'github',
    platformUsername: '',
    accessToken: '',
  };
  modalVisible.value = true;
};

const handleEdit = (record: UserBindEntity) => {
  formState.value = { ...record, accessToken: '' }; // 编辑时不回显Token
  modalVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    await deleteUserBindApi(id);
    message.success('删除成功');
    fetchList();
  } catch {
    // error handled by request interceptor usually
  }
};

const handleOk = async () => {
  modalLoading.value = true;
  try {
    await (formState.value.id
      ? updateUserBindApi(formState.value)
      : addUserBindApi(formState.value));
    message.success('保存成功');
    modalVisible.value = false;
    fetchList();
  } finally {
    modalLoading.value = false;
  }
};

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex justify-end">
      <Button type="primary" @click="handleAdd">新增绑定</Button>
    </div>

    <Table
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :scroll="{ x: 'max-content' }"
      row-key="id"
    >
      <template #bodyCell="{ column, record, text }">
        <template v-if="column.key === 'action'">
          <Button type="link" size="small" @click="handleEdit(record)">
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此绑定吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(record.id)"
          >
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </template>
        <template v-else-if="column.key === 'platform'">
          {{
            platformOptions.find((p) => p.value === record.platform)?.label ||
            record.platform
          }}
        </template>
        <template v-else>
          {{ text }}
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalVisible"
      title="绑定账号"
      @ok="handleOk"
      :confirm-loading="modalLoading"
    >
      <Form layout="vertical" :model="formState">
        <Form.Item label="平台" required>
          <Select
            v-model:value="formState.platform"
            :options="platformOptions"
          />
        </Form.Item>
        <Form.Item label="账号/用户名" required>
          <Input v-model:value="formState.platformUsername" />
        </Form.Item>
        <Form.Item v-if="formState.platform === 'github'" label="Access Token">
          <Input.Password
            v-model:value="formState.accessToken"
            placeholder="若不修改请留空"
          />
          <template #extra>
            <span class="text-xs text-gray-500">
              注：只需读取公开仓库的权限 (public_repo)。
              <a
                class="text-blue-500"
                href="https://github.com/settings/tokens/new"
                rel="noopener noreferrer"
                target="_blank"
              >
                生成token
              </a>
            </span>
          </template>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
