<script setup lang="ts">
import type {
  DoubanAccountVerifyResult,
  UserBindEntity,
} from '#/api/core/user-bind';

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
  verifyDoubanAccountApi,
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
const doubanVerifying = ref(false);
const doubanVerifyResult = ref<DoubanAccountVerifyResult>();
const doubanVerifyError = ref('');
let doubanVerifyRequestId = 0;

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

function resetDoubanVerifyResult() {
  doubanVerifyRequestId += 1;
  doubanVerifying.value = false;
  doubanVerifyResult.value = undefined;
  doubanVerifyError.value = '';
}

function handlePlatformChange() {
  resetDoubanVerifyResult();
}

function handleAccountInputChange() {
  resetDoubanVerifyResult();
}

async function handleVerifyDouban() {
  const accountId = formState.value.platformUsername?.trim() || '';
  if (!accountId) {
    doubanVerifyError.value = '请先填写豆瓣账号 ID';
    return;
  }

  formState.value.platformUsername = accountId;
  resetDoubanVerifyResult();
  const requestId = ++doubanVerifyRequestId;
  doubanVerifying.value = true;
  try {
    const result = await verifyDoubanAccountApi(accountId);
    if (requestId !== doubanVerifyRequestId) return;
    doubanVerifyResult.value = result;
  } catch {
    if (requestId !== doubanVerifyRequestId) return;
    doubanVerifyError.value = '验证失败，请检查账号 ID 或稍后重试';
  } finally {
    if (requestId === doubanVerifyRequestId) {
      doubanVerifying.value = false;
    }
  }
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
  resetDoubanVerifyResult();
  modalVisible.value = true;
};

const handleEdit = (record: any) => {
  formState.value = { ...record, accessToken: '' }; // 编辑时不回显Token
  resetDoubanVerifyResult();
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
            @change="handlePlatformChange"
          />
        </Form.Item>
        <Form.Item
          :label="
            formState.platform === 'douban' ? '豆瓣账号 ID' : '账号/用户名'
          "
          required
        >
          <Input.Search
            v-if="formState.platform === 'douban'"
            v-model:value="formState.platformUsername"
            enter-button="验证"
            placeholder="例如：1234567 或 doubanfilm"
            :loading="doubanVerifying"
            @search="handleVerifyDouban"
            @update:value="handleAccountInputChange"
          />
          <Input v-else v-model:value="formState.platformUsername" />
          <template v-if="formState.platform === 'douban'" #extra>
            <div class="flex flex-col gap-1 text-xs text-gray-500">
              <span
                v-if="doubanVerifyResult"
                class="text-green-600 dark:text-green-400"
              >
                验证成功：{{ doubanVerifyResult.nickname }}
              </span>
              <span
                v-else-if="doubanVerifyError"
                class="text-red-500 dark:text-red-400"
              >
                {{ doubanVerifyError }}（仍可直接保存）
              </span>
              <span>
                获取方式：登录豆瓣后打开
                <a
                  class="text-blue-500"
                  href="https://www.douban.com/mine/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  我的豆瓣
                </a>
                ，进入个人主页。
              </span>
              <span>
                复制主页地址中 <code>/people/</code> 后面的内容。例如地址为
                <code>douban.com/people/doubanfilm/</code>，这里填写
                <code>doubanfilm</code>。
              </span>
              <span>请勿填写昵称、手机号或完整的个人主页地址。</span>
            </div>
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
