<script setup lang="ts">
import type { UserBindEntity } from '#/api/core/user-bind';

import { h, onMounted, ref } from 'vue';

import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
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
  { title: '操作', key: 'action', width: 100 },
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
  { label: 'CSDN', value: 'csdn' },
  { label: '扇贝单词', value: 'shanbay' },
  { label: '豆瓣', value: 'douban' },
];

// 与首页 index.vue 共用：GitHub 绑定变更后清除本地决策缓存，回首页即时重新判断
const GITHUB_BIND_CACHE_KEY = 'aio-life:github-bind';

function clearGithubBindCache() {
  localStorage.removeItem(GITHUB_BIND_CACHE_KEY);
}

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

const handleEdit = (record: any) => {
  formState.value = { ...record, accessToken: '' }; // 编辑时不回显Token
  modalVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    const record = data.value.find((item) => item.id === id);
    await deleteUserBindApi(id);
    if (record?.platform === 'github') {
      clearGithubBindCache();
    }
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
    if (formState.value.platform === 'github') {
      clearGithubBindCache();
    }
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
          <Button
            type="link"
            size="small"
            @click="handleEdit(record)"
            :icon="h(EditOutlined)"
          />
          <Popconfirm
            title="确定要删除此绑定吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete(record.id)"
          >
            <Button type="link" danger size="small" :icon="h(DeleteOutlined)" />
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
      centered
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
          <template v-if="formState.platform === 'douban'" #extra>
            <span class="text-xs text-gray-500">
              <a
                class="text-blue-500"
                href="https://www.douban.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                douban.com
              </a>
              → 点击右上角头像 → 我的主页，URL：douban.com/people/{豆瓣用户ID}
            </span>
          </template>
          <template v-else-if="formState.platform === 'leetcode'" #extra>
            <span class="text-xs text-gray-500">
              <a
                class="text-blue-500"
                href="https://leetcode.cn"
                rel="noopener noreferrer"
                target="_blank"
              >
                leetcode.cn
              </a>
              → 点击右上角头像 → 个人主页，URL：leetcode.cn/u/{用户名}
            </span>
          </template>
          <template v-else-if="formState.platform === 'csdn'" #extra>
            <span class="text-xs text-gray-500">
              <a
                class="text-blue-500"
                href="https://www.csdn.net"
                rel="noopener noreferrer"
                target="_blank"
              >
                csdn.net
              </a>
              → 点击右上角头像 → 个人主页，URL：blog.csdn.net/{用户名}
            </span>
          </template>
          <template v-else-if="formState.platform === 'shanbay'" #extra>
            <span class="text-xs text-gray-500">
              <a
                class="text-blue-500"
                href="https://www.shanbay.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                shanbay.com
              </a>
              → 点击右上角头像 → 个人设置，URL：shangbay.com/user/{用户ID}
            </span>
          </template>
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
