<script setup lang="ts">
import type { ApiKeyVO } from '#/api/core/api-key';

import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Table,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteApiKeyApi,
  generateApiKeyApi,
  getApiKeyListApi,
  updateApiKeyApi,
} from '#/api/core/api-key';
import { AppModal as Modal } from '#/components/app-modal';
import { copyToClipboard } from '#/utils/clipboard';

const loading = ref(false);
const dataSource = ref<ApiKeyVO[]>([]);
const editingId = ref<string>();
const generatedKey = ref('');
const copying = ref(false);
const deletingIds = ref(new Set<string>());
const visible = ref(false);
const confirmLoading = ref(false);
const tableArea = ref<HTMLElement>();
const tableBodyHeight = ref<number>();
const tableScroll = computed(() => ({
  x: 'max-content',
  ...(tableBodyHeight.value === undefined ? {} : { y: tableBodyHeight.value }),
}));

const formState = ref({
  remark: '',
  expireDays: 0,
});

const columns = [
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
  },
  {
    title: 'API Key',
    dataIndex: 'apiKey',
    key: 'apiKey',
  },
  {
    title: '过期时间',
    dataIndex: 'expiredAt',
    key: 'expiredAt',
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
  },
  {
    title: '操作',
    key: 'action',
    width: 112,
    fixed: 'right' as const,
  },
];

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await getApiKeyListApi();
    dataSource.value = res;
  } finally {
    loading.value = false;
  }
};

function openCreate() {
  editingId.value = undefined;
  formState.value = { remark: '', expireDays: 0 };
  visible.value = true;
}

function openEdit(id: string) {
  const record = dataSource.value.find((row) => row.id === id);
  if (!record) return;
  editingId.value = record.id;
  formState.value = { remark: record.remark ?? '', expireDays: 0 };
  visible.value = true;
}

const handleSave = async () => {
  if (confirmLoading.value) return;
  const remark = formState.value.remark.trim();
  if (!remark || remark.length > 255) {
    message.error(remark ? '备注不能超过 255 个字符' : '请输入备注');
    return;
  }
  confirmLoading.value = true;
  try {
    if (editingId.value) {
      const updated = await updateApiKeyApi(editingId.value, { remark });
      dataSource.value = dataSource.value.map((row) =>
        row.id === updated.id ? updated : row,
      );
      message.success('备注已更新');
    } else {
      const data = await generateApiKeyApi({ ...formState.value, remark });
      generatedKey.value = data.apiKey;
      void fetchList();
    }
    visible.value = false;
  } catch {
    // 接口错误由全局拦截器提示，保留表单以便重试。
  } finally {
    confirmLoading.value = false;
  }
};

async function copyKey() {
  if (copying.value || !generatedKey.value) return;
  copying.value = true;
  try {
    await copyToClipboard(generatedKey.value);
    message.success('API Key 已复制');
  } catch {
    message.error('复制失败，请选中密钥手动复制');
  } finally {
    copying.value = false;
  }
}

const handleDelete = async (id: string) => {
  if (deletingIds.value.has(id)) return;
  deletingIds.value.add(id);
  try {
    await deleteApiKeyApi(id);
    dataSource.value = dataSource.value.filter((row) => row.id !== id);
    message.success('删除成功');
  } catch {
    // 保留当前行，由全局拦截器提示错误。
  } finally {
    deletingIds.value.delete(id);
  }
};

function updateTableBodyHeight() {
  if (window.innerWidth < 1024) {
    tableBodyHeight.value = undefined;
    return;
  }

  const header = tableArea.value?.querySelector('.ant-table-thead');
  const pagination = tableArea.value?.querySelector('.ant-table-pagination');
  if (!header) return;
  tableBodyHeight.value = Math.max(
    80,
    Math.floor(
      window.innerHeight -
        header.getBoundingClientRect().bottom -
        (pagination?.getBoundingClientRect().height ?? 32) -
        48,
    ),
  );
}

onMounted(() => {
  void fetchList();
  void nextTick(updateTableBodyHeight);
  window.addEventListener('resize', updateTableBodyHeight);
});
onActivated(() => {
  void nextTick(updateTableBodyHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableBodyHeight);
});
</script>

<template>
  <div class="p-4">
    <div class="mb-4 flex items-center justify-between">
      <div class="text-lg font-medium">API Key 管理</div>
      <Button type="primary" @click="openCreate">创建 API Key</Button>
    </div>

    <div
      ref="tableArea"
      class="table-area"
      :style="
        tableBodyHeight === undefined
          ? undefined
          : { '--table-body-height': `${tableBodyHeight}px` }
      "
    >
      <Table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :scroll="tableScroll"
        row-key="id"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'apiKey'">
            <code
              class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {{ record.apiKey }}
            </code>
          </template>
          <template v-else-if="column.key === 'expiredAt'">
            {{ text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '永不过期' }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ dayjs(text).format('YYYY-MM-DD HH:mm:ss') }}
          </template>
          <template v-else-if="column.key === 'action'">
            <div class="flex items-center gap-1">
              <Button
                type="text"
                aria-label="修改备注"
                :disabled="deletingIds.has(record.id)"
                @click="openEdit(record.id)"
              >
                <template #icon><EditOutlined /></template>
              </Button>
              <Popconfirm
                title="删除后，使用此密钥的应用将无法访问。确定删除？"
                :disabled="deletingIds.has(record.id)"
                @confirm="handleDelete(record.id)"
              >
                <Button
                  type="text"
                  danger
                  aria-label="删除 API Key"
                  :loading="deletingIds.has(record.id)"
                >
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Popconfirm>
            </div>
          </template>
          <template v-else>
            {{ text }}
          </template>
        </template>
      </Table>
    </div>

    <Modal
      v-model:open="visible"
      :title="editingId ? '修改备注' : '创建 API Key'"
      :ok-text="editingId ? '保存' : '创建'"
      :width="480"
      :confirm-loading="confirmLoading"
      @ok="handleSave"
    >
      <Form :model="formState" layout="vertical">
        <Form.Item label="备注" name="remark" required>
          <Input
            v-model:value="formState.remark"
            placeholder="例如：MCP 客户端"
            :maxlength="255"
          />
        </Form.Item>
        <Form.Item v-if="!editingId" label="有效期" name="expireDays">
          <Select v-model:value="formState.expireDays">
            <Select.Option :value="0">永不过期</Select.Option>
            <Select.Option :value="1">1 天</Select.Option>
            <Select.Option :value="7">7 天</Select.Option>
            <Select.Option :value="30">30 天</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      :open="!!generatedKey"
      title="API Key 已创建"
      :width="520"
      :footer="null"
      :busy="copying"
      @cancel="generatedKey = ''"
    >
      <p class="mb-3 text-muted-foreground">
        完整密钥仅显示一次，请复制并妥善保存。
      </p>
      <div class="flex items-start gap-2 rounded-lg bg-muted p-3">
        <code class="min-w-0 flex-1 select-all break-all font-mono">{{
          generatedKey
        }}</code>
        <Button
          type="text"
          class="shrink-0"
          aria-label="复制 API Key"
          :loading="copying"
          @click="copyKey"
        >
          <template #icon><CopyOutlined /></template>
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .table-area :deep(.ant-table-body) {
    min-height: var(--table-body-height);
  }

  .table-area :deep(.ant-table-pagination.ant-pagination) {
    margin-bottom: 0;
  }
}
</style>
