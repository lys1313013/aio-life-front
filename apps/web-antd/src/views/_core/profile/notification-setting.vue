<script setup lang="ts">
import type {
  FeishuChannelConfig,
  FeishuRecipient,
  NotificationPreference,
} from '#/api/core/notification';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Spin,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  deleteFeishuChannelConfigApi,
  getFeishuChannelConfigApi,
  getFeishuRecipientsApi,
  getNotificationPreferencesApi,
  saveFeishuChannelConfigApi,
  testFeishuChannelConfigApi,
  updateNotificationPreferencesApi,
} from '#/api/core/notification';

const loading = ref(false);
const saving = ref(false);
const recipientLoading = ref(false);
const testing = ref(false);
const deleting = ref(false);
const preferenceSaving = ref(false);
const editingCredentials = ref(false);
const manualOpenId = ref(false);

const config = ref<FeishuChannelConfig>({
  bound: false,
  configured: false,
  enabled: false,
});
const recipients = ref<FeishuRecipient[]>([]);
const recipientWarning = ref('');
const preferences = ref<NotificationPreference[]>([]);
const formState = reactive({
  appId: '',
  appSecret: '',
  enabled: false,
  openId: '',
});

const receiverLabel = computed(() => {
  if (!config.value.bound) return '尚未选择';
  return config.value.receiverName || config.value.openIdMasked || '已配置';
});

function maskOpenId(openId: string) {
  if (openId.length <= 10) return 'ou_…';
  return `${openId.slice(0, 6)}…${openId.slice(-4)}`;
}

function recipientLabel(item: FeishuRecipient) {
  return item.name
    ? `${item.name}（${maskOpenId(item.openId)}）`
    : maskOpenId(item.openId);
}

function resetCredentialForm() {
  formState.appId = config.value.appId || '';
  formState.appSecret = '';
  editingCredentials.value = !config.value.configured;
}

async function fetchRecipients() {
  if (!config.value.configured) return;
  recipientLoading.value = true;
  try {
    const result = await getFeishuRecipientsApi();
    recipients.value = result.items;
    recipientWarning.value = result.warning || '';
    if (!formState.openId && result.items.length === 1) {
      formState.openId = result.items[0]!.openId;
    }
  } finally {
    recipientLoading.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const [channelConfig, preferenceList] = await Promise.all([
      getFeishuChannelConfigApi(),
      getNotificationPreferencesApi(),
    ]);
    config.value = channelConfig;
    preferences.value = preferenceList;
    formState.enabled = channelConfig.enabled;
    formState.openId = channelConfig.receiverOpenId || '';
    resetCredentialForm();
    await fetchRecipients();
  } finally {
    loading.value = false;
  }
}

async function handleSaveConfig() {
  if (editingCredentials.value) {
    if (!formState.appId.trim()) {
      message.warning('请填写飞书 App ID');
      return;
    }
    if (!formState.appSecret.trim()) {
      message.warning('请填写飞书 App Secret');
      return;
    }
  }
  if (manualOpenId.value && !formState.openId.trim()) {
    message.warning('请填写接收用户 open_id');
    return;
  }
  saving.value = true;
  try {
    config.value = await saveFeishuChannelConfigApi({
      appId: editingCredentials.value ? formState.appId.trim() : undefined,
      appSecret: editingCredentials.value
        ? formState.appSecret.trim()
        : undefined,
      enabled: formState.enabled,
      // open_id 只在当前应用内有效；更换凭证时由后端重新发现接收人。
      openId: editingCredentials.value
        ? undefined
        : formState.openId.trim() || undefined,
    });
    formState.enabled = config.value.enabled;
    formState.openId = config.value.receiverOpenId || '';
    resetCredentialForm();
    await fetchRecipients();
    if (config.value.bound) {
      message.success('飞书通知已配置并绑定接收人');
    } else if (recipients.value.length > 1) {
      message.info('应用凭证有效，请选择通知接收人');
    } else {
      message.info('应用凭证有效，请配置通知接收人');
    }
  } finally {
    saving.value = false;
  }
}

async function handleTest() {
  if (!config.value.bound) {
    message.warning('请先选择通知接收人');
    return;
  }
  testing.value = true;
  try {
    await testFeishuChannelConfigApi();
    message.success('测试消息已发送，请在飞书中查看');
  } finally {
    testing.value = false;
  }
}

async function handleDelete() {
  deleting.value = true;
  try {
    await deleteFeishuChannelConfigApi();
    config.value = { bound: false, configured: false, enabled: false };
    recipients.value = [];
    recipientWarning.value = '';
    formState.enabled = false;
    formState.openId = '';
    manualOpenId.value = false;
    resetCredentialForm();
    message.success('飞书配置已删除');
  } finally {
    deleting.value = false;
  }
}

async function handleSavePreferences() {
  preferenceSaving.value = true;
  try {
    preferences.value = await updateNotificationPreferencesApi(
      preferences.value,
    );
    message.success('通知类型设置已保存');
  } finally {
    preferenceSaving.value = false;
  }
}

onMounted(fetchData);
</script>

<template>
  <Spin :spinning="loading">
    <div class="notification-setting max-w-3xl space-y-4">
      <Alert
        show-icon
        type="info"
        message="填写 App ID 和 App Secret 即可配置飞书通知"
        description="应用只有一个可见用户时会自动绑定；有多个用户时可直接选择。AIO Life 不会读取飞书消息。"
      />

      <Card title="飞书应用" :bordered="false">
        <Form :model="formState" layout="vertical">
          <template v-if="!editingCredentials && config.configured">
            <Form.Item label="应用凭证">
              <div
                class="config-row rounded-md border border-gray-200 p-3 dark:border-gray-700"
              >
                <div class="min-w-0">
                  <div class="break-all text-sm">{{ config.appId }}</div>
                  <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    App Secret 已加密保存
                  </div>
                </div>
                <Button type="link" @click="editingCredentials = true">
                  更换应用
                </Button>
              </div>
            </Form.Item>
          </template>

          <template v-else>
            <Form.Item label="App ID" required>
              <Input
                v-model:value="formState.appId"
                autocomplete="off"
                placeholder="cli_xxxxxxxxxxxxxxxx"
              />
            </Form.Item>
            <Form.Item label="App Secret" required>
              <Input.Password
                v-model:value="formState.appSecret"
                autocomplete="new-password"
                placeholder="请输入当前应用的 App Secret"
              />
            </Form.Item>
            <Button
              v-if="config.configured"
              class="mb-4"
              @click="resetCredentialForm"
            >
              取消更换
            </Button>
          </template>

          <Form.Item v-if="config.configured" label="通知接收人">
            <div v-if="config.bound" class="mb-2 flex items-center gap-2">
              <Tag color="success">已绑定</Tag>
              <span class="text-sm">{{ receiverLabel }}</span>
              <span
                v-if="config.openIdMasked"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                {{ config.openIdMasked }}
              </span>
            </div>

            <Select
              v-if="!manualOpenId"
              v-model:value="formState.openId"
              :loading="recipientLoading"
              class="w-full"
              allow-clear
              placeholder="请选择应用可见用户"
              show-search
              :filter-option="true"
            >
              <Select.Option
                v-for="item in recipients"
                :key="item.openId"
                :value="item.openId"
              >
                {{ recipientLabel(item) }}
              </Select.Option>
            </Select>
            <Input
              v-else
              v-model:value="formState.openId"
              autocomplete="off"
              placeholder="ou_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />

            <Alert
              v-if="recipientWarning"
              class="mt-2"
              show-icon
              type="warning"
              :message="recipientWarning"
            />
            <Button
              class="mt-2 px-0"
              type="link"
              @click="manualOpenId = !manualOpenId"
            >
              {{ manualOpenId ? '返回用户列表' : '高级设置：手动填写 open_id' }}
            </Button>
          </Form.Item>

          <Form.Item label="启用飞书渠道">
            <div class="flex items-center gap-3">
              <Switch
                v-model:checked="formState.enabled"
                :disabled="!config.bound"
              />
              <span class="text-sm text-gray-500 dark:text-gray-400">
                成功选择接收人后自动启用
              </span>
            </div>
          </Form.Item>

          <div class="action-row">
            <Button type="primary" :loading="saving" @click="handleSaveConfig">
              {{ editingCredentials ? '验证并保存' : '保存设置' }}
            </Button>
            <Button
              :disabled="!config.bound"
              :loading="testing"
              @click="handleTest"
            >
              发送测试消息
            </Button>
            <Popconfirm
              v-if="config.configured"
              title="删除后将清除应用凭证和接收人，确定删除？"
              ok-text="删除"
              cancel-text="取消"
              @confirm="handleDelete"
            >
              <Button danger :loading="deleting">删除配置</Button>
            </Popconfirm>
          </div>
        </Form>
      </Card>

      <Card title="发送类型" :bordered="false">
        <div class="divide-y divide-gray-100 dark:divide-gray-700">
          <div
            v-for="item in preferences"
            :key="item.bizType"
            class="preference-row"
          >
            <div>
              <div class="font-medium">{{ item.description }}</div>
              <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ item.bizType }}
              </div>
            </div>
            <Switch v-model:checked="item.enabled" />
          </div>
        </div>
        <Button
          class="mt-4"
          type="primary"
          :loading="preferenceSaving"
          @click="handleSavePreferences"
        >
          保存发送类型
        </Button>
      </Card>
    </div>
  </Spin>
</template>

<style scoped>
.config-row,
.action-row,
.preference-row {
  display: flex;
  align-items: center;
}

.config-row,
.preference-row {
  justify-content: space-between;
  gap: 16px;
}

.action-row {
  flex-wrap: wrap;
  gap: 8px;
}

.preference-row {
  min-height: 64px;
  padding: 12px 0;
}

@media (max-width: 640px) {
  .config-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .action-row :deep(.ant-btn) {
    height: 44px;
    width: 100%;
  }
}
</style>
