<script setup lang="ts">
import type {
  DoubanAccountVerifyResult,
  UserBindEntity,
} from '#/api/core/user-bind';

import { onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import {
  Button,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Tooltip,
} from 'ant-design-vue';

import {
  addUserBindApi,
  deleteUserBindApi,
  getUserBindListApi,
  updateUserBindApi,
  verifyDoubanAccountApi,
} from '#/api/core/user-bind';
import csdnIcon from '#/assets/platforms/csdn.png';

const data = ref<UserBindEntity[]>([]);
const loading = ref(true);
const deletingIds = ref(new Set<UserBindEntity['id']>());
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
  { label: 'GitHub', value: 'github', icon: 'simple-icons:github', color: '' },
  {
    label: 'LeetCode',
    value: 'leetcode',
    icon: 'devicon:leetcode',
    color: '',
  },
  { label: 'CSDN', value: 'csdn', icon: '', color: '' },
  {
    label: '扇贝单词',
    value: 'shanbay',
    icon: 'svg:shanbay',
    color: '#28b78d',
  },
  {
    label: '豆瓣',
    value: 'douban',
    icon: 'simple-icons:douban',
    color: '',
  },
  {
    label: '微信读书',
    value: 'weread',
    icon: 'simple-icons:weread',
    color: '#37a7ff',
  },
];

function getPlatform(platform: string) {
  return (
    platformOptions.find((item) => item.value === platform) ?? {
      label: platform,
      value: platform,
      icon: 'lucide:link',
      color: '',
    }
  );
}

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

const handleEdit = (record: UserBindEntity) => {
  formState.value = { ...record, accessToken: '' }; // 编辑时不回显Token
  resetDoubanVerifyResult();
  modalVisible.value = true;
};

const handleDelete = async (id: UserBindEntity['id']) => {
  if (!id || deletingIds.value.has(id)) return;
  deletingIds.value.add(id);
  try {
    const record = data.value.find((item) => item.id === id);
    await deleteUserBindApi(id);
    if (record?.platform === 'github') {
      clearGithubBindCache();
    }
    message.success('已解除绑定');
    data.value = data.value.filter((item) => item.id !== id);
  } catch {
    // error handled by request interceptor usually
  } finally {
    deletingIds.value.delete(id);
  }
};

const handleOk = async () => {
  if (
    formState.value.platform === 'weread' &&
    !formState.value.id &&
    !formState.value.accessToken?.trim()
  ) {
    message.warning('请填写微信读书 API Key');
    return;
  }
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
  <div class="p-2 sm:p-4">
    <div class="mb-3 flex justify-end">
      <Tooltip title="新增绑定">
        <Button
          type="text"
          shape="circle"
          aria-label="新增绑定"
          @click="handleAdd"
        >
          <template #icon>
            <VbenIcon icon="lucide:plus" class="size-5" />
          </template>
        </Button>
      </Tooltip>
    </div>

    <div
      v-if="loading"
      class="grid gap-3 md:grid-cols-2"
      aria-label="加载中"
      aria-busy="true"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="rounded-xl border border-border p-5"
      >
        <Skeleton active :title="{ width: '40%' }" :paragraph="{ rows: 1 }" />
      </div>
    </div>
    <div v-else-if="data.length > 0" class="grid gap-2 md:grid-cols-2">
      <article
        v-for="record in data"
        :key="record.id"
        class="flex min-w-0 items-center gap-3 rounded-xl bg-muted/40 px-3 py-4 transition-colors hover:bg-muted/70"
        :aria-label="`${getPlatform(record.platform).label}账号绑定`"
      >
        <Tooltip :title="getPlatform(record.platform).label">
          <span class="flex size-9 shrink-0 items-center justify-center">
            <img
              v-if="record.platform === 'csdn'"
              :src="csdnIcon"
              alt=""
              class="size-7 rounded-md"
            />
            <VbenIcon
              v-else
              :icon="getPlatform(record.platform).icon"
              :style="{
                color: getPlatform(record.platform).color || undefined,
              }"
              :class="{
                'weread-icon': record.platform === 'weread',
                'douban-icon': record.platform === 'douban',
                'leetcode-icon': record.platform === 'leetcode',
              }"
              class="size-7"
            />
          </span>
        </Tooltip>
        <span
          class="min-w-0 flex-1 truncate text-sm"
          :title="record.platformUsername"
        >
          {{
            record.platform === 'weread'
              ? '微信读书'
              : record.platformUsername || getPlatform(record.platform).label
          }}
        </span>
        <div class="flex shrink-0 items-center gap-1 text-muted-foreground">
          <Tooltip title="编辑">
            <Button
              type="text"
              shape="circle"
              :disabled="deletingIds.has(record.id)"
              :aria-label="`编辑${getPlatform(record.platform).label}绑定`"
              @click="handleEdit(record)"
            >
              <template #icon>
                <VbenIcon icon="lucide:pencil" class="size-4" />
              </template>
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定解除此账号绑定吗？"
            ok-text="解除绑定"
            cancel-text="取消"
            :ok-button-props="{ danger: true }"
            @confirm="handleDelete(record.id)"
          >
            <Tooltip title="解除绑定">
              <Button
                type="text"
                shape="circle"
                :loading="deletingIds.has(record.id)"
                :disabled="deletingIds.has(record.id)"
                :aria-label="`解除${getPlatform(record.platform).label}绑定`"
              >
                <template #icon>
                  <VbenIcon icon="lucide:unlink" class="size-4" />
                </template>
              </Button>
            </Tooltip>
          </Popconfirm>
        </div>
      </article>
    </div>
    <Empty v-else description="还没有绑定账号" class="py-12">
      <Button type="primary" @click="handleAdd">绑定第一个账号</Button>
    </Empty>

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
            @change="handlePlatformChange"
          >
            <Select.Option
              v-for="platform in platformOptions"
              :key="platform.value"
              :value="platform.value"
            >
              <span class="inline-flex items-center gap-2">
                <img
                  v-if="platform.value === 'csdn'"
                  :src="csdnIcon"
                  alt=""
                  class="size-4 rounded-sm"
                />
                <VbenIcon
                  v-else
                  :icon="platform.icon"
                  :style="{ color: platform.color || undefined }"
                  :class="{
                    'weread-icon': platform.value === 'weread',
                    'douban-icon': platform.value === 'douban',
                    'leetcode-icon': platform.value === 'leetcode',
                  }"
                  class="size-4"
                />
                {{ platform.label }}
              </span>
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          v-if="formState.platform !== 'weread'"
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
        <Form.Item
          v-if="['github', 'weread'].includes(formState.platform)"
          :label="formState.platform === 'weread' ? 'API Key' : 'Access Token'"
          :required="formState.platform === 'weread' && !formState.id"
        >
          <Input.Password
            v-model:value="formState.accessToken"
            :placeholder="
              formState.platform === 'weread'
                ? formState.id
                  ? '若不修改请留空'
                  : 'wrk-xxxxxxxx'
                : '若不修改请留空'
            "
          />
          <template #extra>
            <span
              v-if="formState.platform === 'github'"
              class="text-xs text-gray-500"
            >
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
            <span v-else class="text-xs text-gray-500">
              在
              <a
                class="text-blue-500"
                href="https://weread.qq.com/r/weread-skills"
                rel="noopener noreferrer"
                target="_blank"
              >
                微信读书官方授权页
              </a>
              获取。密钥仅由服务端用于查询你的阅读统计。
            </span>
          </template>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
/* 保留品牌图标的白色镂空，不随页面主题变化。 */
.weread-icon {
  background-color: #fff;
  border-radius: 21.3333%;
}

/* 只让黑色笔画跟随主题，保留 LeetCode 的金色和灰色。 */
.leetcode-icon :deep(path[fill='#070706']) {
  fill: currentColor;
}

/* 豆瓣使用绿底白字的应用图标样式，保留矢量字形。 */
.douban-icon {
  padding: 4px;
  color: #fff;
  background-color: #00b51d;
  border-radius: 20%;
}
</style>
