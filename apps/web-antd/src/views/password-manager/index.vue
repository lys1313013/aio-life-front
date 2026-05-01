<script setup lang="ts">
import type { PasswordVault } from '#/api/core/password-manager';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
  StarOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deletePasswordApi,
  getCategoriesApi,
  getPasswordListApi,
  updatePasswordApi,
} from '#/api/core/password-manager';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';
import { usePasswordVaultStore } from '#/store/password-vault';
import { copyToClipboard } from '#/utils/clipboard';
import { decryptText } from '#/utils/crypto';

import PasswordModal from './PasswordModal.vue';

interface DecryptedPassword extends PasswordVault {
  decryptedUsername?: string;
  decryptedPassword?: string;
  decryptedRemark?: string;
  showPassword?: boolean;
}

const store = usePasswordVaultStore();

const passwordModalRef = ref<InstanceType<typeof PasswordModal> | null>(null);

const passwords = ref<PasswordVault[]>([]);
const decryptedPasswords = ref<DecryptedPassword[]>([]);
const loading = ref(false);
const searchText = ref('');
const selectedCategory = ref<string | undefined>(undefined);
const categories = ref<string[]>([]);

const showUnlockModal = ref(false);
const unlockLoading = ref(false);
const masterPasswordInput = ref('');
const confirmPasswordInput = ref('');
const pendingAction = ref<(() => void) | null>(null);

const isFirstTime = computed(
  () => passwords.value.length === 0 && !loading.value,
);

const filteredPasswords = computed(() => {
  let result = decryptedPasswords.value;
  if (searchText.value) {
    const search = searchText.value.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        (p.website && p.website.toLowerCase().includes(search)),
    );
  }
  if (selectedCategory.value) {
    result = result.filter((p) => p.category === selectedCategory.value);
  }
  return result;
});

const fetchPasswords = async () => {
  loading.value = true;
  try {
    passwords.value = await getPasswordListApi();
    decryptedPasswords.value = passwords.value.map((p) => ({
      ...p,
      showPassword: false,
      decryptedUsername:
        p.username && /^[0-9a-f]{32,}$/i.test(p.username)
          ? undefined
          : p.username,
    }));

    if (store.isUnlocked) {
      await decryptPasswords();
    }
  } catch {
    message.error('获取密码列表失败');
  } finally {
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    categories.value = await getCategoriesApi();
  } catch {
    categories.value = ['工作', '生活', '金融', '社交', '其他'];
  }
};

const decryptPasswords = async () => {
  if (!store.masterKey) return;

  for (const p of decryptedPasswords.value) {
    try {
      if (p.username && /^[0-9a-f]{32,}$/i.test(p.username)) {
        p.decryptedUsername = await decryptText(
          p.username,
          store.masterKey,
          p.salt,
        );
      } else {
        p.decryptedUsername = p.username;
      }
    } catch {
      p.decryptedUsername = p.username; // fallback to original
    }

    try {
      p.decryptedPassword = await decryptText(
        p.password,
        store.masterKey,
        p.salt,
      );
    } catch {
      p.decryptedPassword = '解密失败';
    }

    try {
      if (p.remark) {
        p.decryptedRemark = await decryptText(
          p.remark,
          store.masterKey,
          p.salt,
        );
      }
    } catch {
      p.decryptedRemark = '解密失败';
    }
  }
};

const requireUnlock = (action: () => void) => {
  if (store.isUnlocked) {
    action();
  } else {
    masterPasswordInput.value = '';
    confirmPasswordInput.value = '';
    pendingAction.value = action;
    showUnlockModal.value = true;
  }
};

const handleUnlockSubmit = async () => {
  if (!masterPasswordInput.value) {
    message.warning('请输入主密码');
    return;
  }

  if (isFirstTime.value) {
    if (masterPasswordInput.value !== confirmPasswordInput.value) {
      message.warning('两次输入的密码不一致');
      return;
    }
    if (masterPasswordInput.value.length < 6) {
      message.warning('主密码长度至少6位');
      return;
    }
  }

  unlockLoading.value = true;
  try {
    if (!isFirstTime.value && passwords.value.length > 0) {
      const testItem = passwords.value[0]!;
      try {
        await decryptText(
          testItem.password,
          masterPasswordInput.value,
          testItem.salt,
        );
      } catch {
        message.error('主密码不正确，解密验证失败');
        return;
      }
    }

    store.unlock(masterPasswordInput.value);
    showUnlockModal.value = false;
    message.success('解锁成功');

    await decryptPasswords();

    if (pendingAction.value) {
      pendingAction.value();
      pendingAction.value = null;
    }
  } finally {
    unlockLoading.value = false;
  }
};

const handleTogglePassword = (item: DecryptedPassword) => {
  requireUnlock(() => {
    item.showPassword = !item.showPassword;
    store.updateActivity();
  });
};

const handleCopy = (item: DecryptedPassword, type: 'password' | 'username') => {
  const executeCopy = async (text: string, typeName: string) => {
    try {
      if (!text || text === '解密失败') {
        message.error('未找到有效内容可复制');
        return;
      }
      await copyToClipboard(text);
      if (typeName === 'username') {
        message.success('账号已复制到剪贴板');
      } else {
        message.success('密码已复制到剪贴板，30秒后自动清除');
        setTimeout(() => {
          copyToClipboard('');
        }, 30_000);
      }
    } catch {
      message.error('复制失败');
    }
  };

  if (
    type === 'username' &&
    item.decryptedUsername &&
    item.decryptedUsername !== '******'
  ) {
    executeCopy(item.decryptedUsername, 'username');
    return;
  }

  requireUnlock(async () => {
    const text =
      type === 'username' ? item.decryptedUsername : item.decryptedPassword;
    if (text) {
      await executeCopy(text, type);
    }
  });
};

const handleToggleFavorite = async (item: DecryptedPassword) => {
  try {
    await updatePasswordApi(item.id, {
      title: item.title,
      website: item.website,
      category: item.category,
      username: item.username,
      password: item.password,
      salt: item.salt,
      remark: item.remark,
      favorite: !item.favorite,
    });
    item.favorite = !item.favorite;
    message.success(item.favorite ? '已添加收藏' : '已取消收藏');
  } catch {
    message.error('操作失败');
  }
};

const handleDelete = async (id: string) => {
  try {
    await deletePasswordApi(id);
    message.success('删除成功');
    fetchPasswords();
  } catch {
    message.error('删除失败');
  }
};

const handleEdit = (id: string) => {
  requireUnlock(() => {
    store.updateActivity();
    passwordModalRef.value?.openModal(id);
  });
};

const handleAdd = () => {
  requireUnlock(() => {
    store.updateActivity();
    passwordModalRef.value?.openModal();
  });
};

const handleManualLock = () => {
  store.lock();
  for (const p of decryptedPasswords.value) {
    p.showPassword = false;
    p.decryptedUsername =
      p.username && /^[0-9a-f]{32,}$/i.test(p.username)
        ? undefined
        : p.username;
    p.decryptedPassword = undefined;
    p.decryptedRemark = undefined;
  }
  message.success('已锁定密码库');
};

const formatTime = (time: string) => {
  try {
    return dayjs(time).format('YYYY-MM-DD HH:mm');
  } catch {
    return time;
  }
};

// Activity tracking for auto-lock
let activityCheckInterval: number;

onMounted(() => {
  fetchPasswords();
  fetchCategories();

  // Check for timeout every minute
  activityCheckInterval = window.setInterval(() => {
    if (store.checkTimeout()) {
      message.warning('由于长时间无操作，已自动锁定');
      // Hide decrypted passwords
      for (const p of decryptedPasswords.value) {
        p.showPassword = false;
        p.decryptedUsername =
          p.username && /^[0-9a-f]{32,}$/i.test(p.username)
            ? undefined
            : p.username;
        p.decryptedPassword = undefined;
        p.decryptedRemark = undefined;
      }
    }
  }, 60_000);

  // Track user activity
  const handleActivity = () => store.updateActivity();
  document.addEventListener('click', handleActivity);
  document.addEventListener('keypress', handleActivity);
});

onUnmounted(() => {
  clearInterval(activityCheckInterval);
});
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden p-5">
    <!-- Header Search -->
    <div class="mb-4 flex gap-3">
      <Input
        v-model:value="searchText"
        placeholder="搜索标题或网站..."
        class="flex-1"
        allow-clear
      >
        <template #prefix><SearchOutlined /></template>
      </Input>
      <Select
        v-model:value="selectedCategory"
        placeholder="选择分类"
        class="w-32"
        allow-clear
      >
        <Select.Option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat }}
        </Select.Option>
      </Select>
      <Button @click="fetchPasswords"> 刷新 </Button>
      <Tooltip :title="store.isUnlocked ? '锁定密码库' : '解锁密码库'">
        <Button
          @click="
            store.isUnlocked ? handleManualLock() : requireUnlock(() => {})
          "
        >
          <template #icon>
            <UnlockOutlined v-if="store.isUnlocked" class="text-green-500" />
            <LockOutlined v-else class="text-slate-400" />
          </template>
        </Button>
      </Tooltip>
    </div>

    <!-- Password List -->
    <div class="flex-1 overflow-y-auto">
      <Spin :spinning="loading">
        <div
          v-if="filteredPasswords.length > 0"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div
            v-for="item in filteredPasswords"
            :key="item.id"
            class="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-semibold">{{ item.title }}</h3>
                  <span
                    v-if="item.category"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700"
                  >
                    {{ item.category }}
                  </span>
                </div>
                <p v-if="item.website" class="mt-1 text-sm text-slate-500">
                  {{ item.website }}
                </p>
                <div class="mt-2 flex gap-4">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-slate-500">账号：</span>
                    <span class="font-mono text-sm">{{
                      item.decryptedUsername || '******'
                    }}</span>
                    <Tooltip title="复制账号">
                      <CopyOutlined
                        class="cursor-pointer text-slate-400 hover:text-blue-500"
                        @click="handleCopy(item, 'username')"
                      />
                    </Tooltip>
                  </div>
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-sm text-slate-500">密码：</span>
                  <span class="font-mono text-sm">
                    {{
                      item.showPassword
                        ? item.decryptedPassword || '******'
                        : '******'
                    }}
                  </span>
                  <Tooltip :title="item.showPassword ? '隐藏密码' : '显示密码'">
                    <EyeOutlined
                      v-if="!item.showPassword"
                      class="cursor-pointer text-slate-400 hover:text-blue-500"
                      @click="handleTogglePassword(item)"
                    />
                    <EyeInvisibleOutlined
                      v-else
                      class="cursor-pointer text-slate-400 hover:text-blue-500"
                      @click="handleTogglePassword(item)"
                    />
                  </Tooltip>
                  <Tooltip title="复制密码">
                    <CopyOutlined
                      class="cursor-pointer text-slate-400 hover:text-blue-500"
                      @click="handleCopy(item, 'password')"
                    />
                  </Tooltip>
                </div>
                <p
                  v-if="item.decryptedRemark && item.showPassword"
                  class="mt-2 text-sm text-slate-400"
                >
                  备注：{{ item.decryptedRemark }}
                </p>
              </div>
              <div
                class="flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <Tooltip title="收藏">
                  <Button
                    type="text"
                    size="small"
                    @click="handleToggleFavorite(item)"
                  >
                    <template #icon>
                      <StarFilled
                        v-if="item.favorite"
                        class="text-yellow-500"
                      />
                      <StarOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="编辑">
                  <Button type="text" size="small" @click="handleEdit(item.id)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="确定要删除这条记录吗？"
                  ok-text="是"
                  cancel-text="否"
                  @confirm="handleDelete(item.id)"
                >
                  <Tooltip title="删除">
                    <Button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </div>
            <div class="mt-2 text-xs text-slate-400">
              更新时间：{{ formatTime(item.updateTime) }}
            </div>
          </div>
        </div>
        <Empty
          v-else-if="isFirstTime && !loading"
          description="首次使用，请先设置主密码并添加密码"
        >
          <Button type="primary" @click="handleAdd">
            <PlusOutlined /> 添加密码
          </Button>
        </Empty>
        <Empty v-else-if="!loading" description="暂无密码">
          <Button type="primary" @click="handleAdd">
            <PlusOutlined /> 添加密码
          </Button>
        </Empty>
      </Spin>
    </div>

    <GlobalFloatBtn @click="handleAdd" />

    <!-- Unlock Modal -->
    <Modal
      v-model:open="showUnlockModal"
      :title="isFirstTime ? '设置主密码' : '解锁密码库'"
      :confirm-loading="unlockLoading"
      @ok="handleUnlockSubmit"
      @cancel="showUnlockModal = false"
    >
      <Form layout="vertical" @submit.prevent="handleUnlockSubmit">
        <FormItem :label="isFirstTime ? '设置主密码' : '主密码'">
          <Input
            v-model:value="masterPasswordInput"
            type="password"
            placeholder="请输入主密码"
            :autocomplete="isFirstTime ? 'new-password' : 'current-password'"
            @keyup.enter="handleUnlockSubmit"
          />
        </FormItem>
        <FormItem v-if="isFirstTime" label="确认主密码">
          <Input
            v-model:value="confirmPasswordInput"
            type="password"
            placeholder="请再次输入主密码"
            autocomplete="new-password"
            @keyup.enter="handleUnlockSubmit"
          />
        </FormItem>
      </Form>
    </Modal>
    <!-- Password Add/Edit Modal -->
    <PasswordModal ref="passwordModalRef" @success="fetchPasswords" />
  </div>
</template>

<style scoped></style>
