<script setup lang="ts">
import type { SystemConfigVO } from '#/api/system/system-config';

import { onMounted, ref } from 'vue';

import {
  Button as AButton,
  Card as ACard,
  Input as AInput,
  Select as ASelect,
  Spin as ASpin,
  Switch as ASwitch,
  Tag as ATag,
  message,
} from 'ant-design-vue';

import { queryAdminUsers } from '#/api/core/feedback';
import {
  querySystemConfigs,
  updateSystemConfig,
} from '#/api/system/system-config';

const loading = ref(false);
const configs = ref<SystemConfigVO[]>([]);
const savingKey = ref<null | string>(null);

// 编辑中的值
const editValues = ref<Record<string, any>>({});

// 管理员列表（用于 feedback.notify_admin_ids 的 select）
const adminUsers = ref<{ id: string; nickname: string; username: string }[]>(
  [],
);

const loadConfigs = async () => {
  try {
    loading.value = true;
    const res = await querySystemConfigs();
    configs.value = res || [];
    // 初始化编辑值
    for (const cfg of configs.value) {
      if (cfg.configType === 'JSON') {
        try {
          editValues.value[cfg.configKey] = JSON.parse(cfg.configValue || '[]');
        } catch {
          editValues.value[cfg.configKey] = [];
        }
      } else if (cfg.configType === 'BOOLEAN') {
        editValues.value[cfg.configKey] = cfg.configValue === 'true';
      } else {
        editValues.value[cfg.configKey] = cfg.configValue || '';
      }
    }
  } catch (error) {
    console.error('加载配置失败', error);
  } finally {
    loading.value = false;
  }
};

const loadAdminUsers = async () => {
  try {
    const res = await queryAdminUsers();
    adminUsers.value = res || [];
  } catch (error) {
    console.error('加载管理员列表失败', error);
  }
};

onMounted(async () => {
  await Promise.all([loadConfigs(), loadAdminUsers()]);
});

const handleSave = async (key: string) => {
  try {
    savingKey.value = key;
    let value: string;
    const cfg = configs.value.find((c) => c.configKey === key);

    if (cfg?.configType === 'JSON') {
      value = JSON.stringify(editValues.value[key] || []);
    } else if (cfg?.configType === 'BOOLEAN') {
      value = editValues.value[key] ? 'true' : 'false';
    } else {
      value = editValues.value[key] || '';
    }

    await updateSystemConfig(key, value);
    message.success('保存成功');
    // 刷新
    await loadConfigs();
  } catch (error) {
    console.error('保存失败', error);
    message.error('保存失败');
  } finally {
    savingKey.value = null;
  }
};

const getUserLabel = (userId: string) => {
  const user = adminUsers.value.find((u) => u.id === userId);
  if (!user) return `用户${userId}`;
  return user.nickname || user.username;
};
</script>

<template>
  <div class="min-h-full bg-background/50 p-4 lg:p-6">
    <div class="mb-6">
      <h2 class="text-xl font-bold text-card-foreground">系统配置</h2>
      <p class="text-muted-foreground">管理系统级配置项</p>
    </div>

    <ASpin :spinning="loading">
      <div class="space-y-4">
        <ACard
          v-for="cfg in configs"
          :key="cfg.configKey"
          class="rounded-xl border border-border bg-card"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <span class="font-medium text-card-foreground">{{
                cfg.description || cfg.configKey
              }}</span>
              <ATag class="m-0 text-xs">{{ cfg.configType }}</ATag>
            </div>
          </template>
          <template #extra>
            <span class="text-xs text-muted-foreground">
              更新于 {{ cfg.updateTime || '-' }}
            </span>
          </template>

          <div class="mb-2 text-xs text-muted-foreground">
            Key: <code>{{ cfg.configKey }}</code>
          </div>

          <!-- JSON 类型 - 管理员选择器 -->
          <div
            v-if="
              cfg.configType === 'JSON' &&
              cfg.configKey === 'feedback.notify_admin_ids'
            "
          >
            <ASelect
              v-model:value="editValues[cfg.configKey]"
              mode="multiple"
              placeholder="选择接收通知的管理员"
              class="w-full"
              style="min-height: 32px"
            >
              <ASelect.Option
                v-for="user in adminUsers"
                :key="user.id"
                :value="user.id"
              >
                {{ user.nickname || user.username }} ({{ user.username }})
              </ASelect.Option>
            </ASelect>
            <div
              v-if="editValues[cfg.configKey]?.length > 0"
              class="mt-2 flex flex-wrap gap-1"
            >
              <ATag
                v-for="uid in editValues[cfg.configKey]"
                :key="uid"
                color="blue"
                class="m-0"
              >
                {{ getUserLabel(uid) }}
              </ATag>
            </div>
            <div class="mt-1 text-xs text-muted-foreground">
              当用户提交反馈或追加评论时，将通知以上管理员
            </div>
          </div>

          <!-- JSON 类型 - 通用 -->
          <div v-else-if="cfg.configType === 'JSON'">
            <AInput
              v-model:value="editValues[cfg.configKey]"
              type="textarea"
              :rows="3"
              placeholder="JSON 格式"
            />
          </div>

          <!-- BOOLEAN 类型 -->
          <div v-else-if="cfg.configType === 'BOOLEAN'">
            <ASwitch v-model:checked="editValues[cfg.configKey]" />
            <span class="ml-2 text-sm text-muted-foreground">
              {{ editValues[cfg.configKey] ? '已启用' : '已禁用' }}
            </span>
          </div>

          <!-- STRING / NUMBER 类型 -->
          <div v-else>
            <AInput
              v-model:value="editValues[cfg.configKey]"
              :placeholder="cfg.description || ''"
            />
          </div>

          <div class="mt-3 flex justify-end">
            <AButton
              type="primary"
              :loading="savingKey === cfg.configKey"
              @click="handleSave(cfg.configKey)"
            >
              保存
            </AButton>
          </div>
        </ACard>

        <div
          v-if="configs.length === 0 && !loading"
          class="py-20 text-center text-muted-foreground"
        >
          暂无配置项
        </div>
      </div>
    </ASpin>
  </div>
</template>
