<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { BankOption } from '#/api/bank-card';
import type { CoverTemplate } from '#/api/bank-card/covers';
import type { ApiRequests } from '#/api/payload';

import { computed, onMounted, ref } from 'vue';

import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Spin,
  Switch,
} from 'ant-design-vue';

import {
  deleteCoverTemplate,
  listCoverBanks,
  listCoverTemplates,
  saveCoverTemplate,
  setCoverEnabled,
  uploadTemplateCover,
} from '#/api/bank-card/covers';
import { AppModal as Modal } from '#/components/app-modal';
import CoverPicker from '#/views/bank-card/cover-picker.vue';

import CoverPreview from './cover-preview.vue';

const banks = ref<BankOption[]>([]);
const items = ref<CoverTemplate[]>([]);
const failed = ref(false);
const loading = ref(false);
const open = ref(false);
const saving = ref(false);
const uploading = ref(false);
const busy = ref<Record<string, boolean>>({});
const bankFilter = ref<string>();
const enabledFilter = ref<number>();
const search = ref('');
const typeFilter = ref<string>();
const editing = ref<CoverTemplate>();
const formRef = ref<FormInstance>();
function empty(): ApiRequests['BankCardCoverTemplateReq'] {
  return {
    name: '',
    bankId: null,
    cardType: 'debit',
    sourceUrl: null,
    fileId: '',
    isEnabled: 1,
    sortOrder: 0,
  };
}
const form = ref(empty());
const types = [
  { value: 'debit', label: '储蓄卡' },
  { value: 'credit', label: '信用卡' },
];
const bankOptions = computed(() =>
  banks.value.map((b) => ({
    value: b.id,
    label: b.name,
    disabled: !b.enabled && b.id !== editing.value?.bankId,
  })),
);
const filtered = computed(() =>
  items.value
    .filter(
      (item) =>
        (!search.value.trim() ||
          `${item.name} ${item.bankName}`.includes(search.value.trim())) &&
        (!bankFilter.value || item.bankId === bankFilter.value) &&
        (!typeFilter.value || item.cardType === typeFilter.value) &&
        (enabledFilter.value === undefined ||
          item.isEnabled === enabledFilter.value),
    )
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)),
);
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const result = await Promise.all([listCoverTemplates(), listCoverBanks()]);
    items.value = result[0];
    banks.value = result[1];
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
function edit(item?: CoverTemplate) {
  editing.value = item;
  form.value = item
    ? {
        name: item.name,
        bankId: item.bankId,
        cardType: item.cardType,
        sourceUrl: item.sourceUrl,
        fileId: item.fileId,
        isEnabled: item.isEnabled,
        sortOrder: item.sortOrder,
      }
    : empty();
  open.value = true;
  formRef.value?.clearValidate();
}
function replace(item: CoverTemplate) {
  items.value = [...items.value.filter((row) => row.id !== item.id), item];
}
async function save() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  saving.value = true;
  try {
    replace(await saveCoverTemplate(form.value, editing.value?.id));
    open.value = false;
  } finally {
    saving.value = false;
  }
}
async function toggle(item: CoverTemplate) {
  busy.value[item.id] = true;
  try {
    replace(await setCoverEnabled(item.id, item.isEnabled === 1 ? 0 : 1));
  } finally {
    busy.value[item.id] = false;
  }
}
async function remove(item: CoverTemplate) {
  busy.value[item.id] = true;
  try {
    await deleteCoverTemplate(item.id);
    items.value = items.value.filter((row) => row.id !== item.id);
  } finally {
    busy.value[item.id] = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="cover-page">
    <div class="cover-toolbar">
      <Input
        v-model:value="search"
        aria-label="搜索卡面"
        placeholder="搜索卡面"
        class="cover-search"
        allow-clear
      />
      <Select
        v-model:value="bankFilter"
        :options="banks.map((b) => ({ value: b.id, label: b.name }))"
        show-search
        option-filter-prop="label"
        allow-clear
        placeholder="全部银行"
        aria-label="筛选银行"
        class="cover-bank-filter"
      />
      <Select
        v-model:value="typeFilter"
        :options="types"
        allow-clear
        placeholder="全部类型"
        aria-label="筛选类型"
        class="cover-filter"
      />
      <Select
        v-model:value="enabledFilter"
        :options="[
          { value: 1, label: '启用' },
          { value: 0, label: '停用' },
        ]"
        allow-clear
        placeholder="全部状态"
        aria-label="筛选状态"
        class="cover-filter"
      />
      <div class="cover-toolbar-actions">
        <Button aria-label="刷新卡面" :loading="loading" @click="load">
          <ReloadOutlined />
        </Button>
        <Button
          type="primary"
          aria-label="新增公共卡面"
          :disabled="loading || failed"
          @click="edit()"
        >
          <PlusOutlined />
        </Button>
      </div>
    </div>
    <Spin :spinning="loading">
      <div class="cover-content">
        <Button v-if="failed" @click="load">加载失败，重试</Button>
        <Empty
          v-else-if="!loading && filtered.length === 0"
          description="暂无卡面"
        />
        <div class="cover-grid">
          <div v-for="item in filtered" :key="item.id" class="cover-item">
            <div
              role="button"
              :tabindex="busy[item.id] ? -1 : 0"
              :aria-label="`编辑${item.name}`"
              :aria-disabled="!!busy[item.id]"
              class="cursor-pointer rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              @click="!busy[item.id] && edit(item)"
              @keydown.enter.self.prevent="!busy[item.id] && edit(item)"
              @keydown.space.self.prevent="!busy[item.id] && edit(item)"
            >
              <CoverPreview :file-id="item.fileId" :name="item.name" />
            </div>
            <div class="cover-info">
              <div class="cover-name" :title="item.name">{{ item.name }}</div>
              <div class="cover-meta">
                {{ item.bankName }} ·
                {{ item.cardType === 'credit' ? '信用卡' : '储蓄卡' }} ·
                {{ item.usageCount }} 张使用
              </div>
              <Switch
                :checked="item.isEnabled === 1"
                :loading="busy[item.id]"
                :aria-label="`${item.isEnabled ? '停用' : '启用'}${item.name}`"
                @change="toggle(item)"
              />
              <Popconfirm
                :title="`删除${item.name}？`"
                :disabled="item.usageCount > 0 || busy[item.id]"
                @confirm="remove(item)"
              >
                <Button
                  type="text"
                  danger
                  :aria-label="`删除${item.name}`"
                  class="cover-delete"
                  :disabled="item.usageCount > 0"
                  :loading="busy[item.id]"
                >
                  <DeleteOutlined />
                </Button>
              </Popconfirm>
            </div>
          </div>
        </div>
      </div>
    </Spin>
    <Modal
      v-model:open="open"
      :title="editing ? '编辑公共卡面' : '新增公共卡面'"
      centered
      :width="620"
      :confirm-loading="saving"
      :ok-button-props="{ disabled: uploading }"
      :cancel-button-props="{ disabled: saving || uploading }"
      :closable="!saving && !uploading"
      :mask-closable="!saving && !uploading"
      :keyboard="!saving && !uploading"
      @ok="save"
    >
      <Form
        ref="formRef"
        :model="form"
        layout="vertical"
        :disabled="saving || uploading"
      >
        <div class="mx-auto mb-4 max-w-80">
          <CoverPreview
            :file-id="form.fileId || undefined"
            :name="form.name || '卡面预览'"
          />
          <FormItem
            name="fileId"
            :rules="[{ required: true, message: '请上传卡面图片' }]"
          >
            <CoverPicker
              :active="open && !saving"
              :file-id="form.fileId || undefined"
              :upload-fn="uploadTemplateCover"
              @change="form.fileId = $event || ''"
              @busy="uploading = $event"
            />
          </FormItem>
        </div>
        <FormItem
          label="卡面名称"
          name="name"
          :rules="[
            { required: true, whitespace: true, message: '请输入卡面名称' },
          ]"
        >
          <Input
            :value="form.name ?? undefined"
            @update:value="form.name = $event"
            :maxlength="100"
          />
        </FormItem>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <FormItem
            label="银行"
            name="bankId"
            :rules="[{ required: true, message: '请选择银行' }]"
          >
            <Select
              :value="form.bankId ?? undefined"
              @update:value="
                form.bankId = $event == null ? null : String($event)
              "
              :options="bankOptions"
              show-search
              option-filter-prop="label"
              :disabled="!!editing?.usageCount"
            />
          </FormItem>
          <FormItem label="银行卡类型" name="cardType">
            <Select
              :value="form.cardType ?? undefined"
              @update:value="form.cardType = String($event)"
              :options="types"
              :disabled="!!editing?.usageCount"
            />
          </FormItem>
        </div>
        <FormItem
          label="图片出处"
          name="sourceUrl"
          :rules="[{ type: 'url', message: '请输入完整网页地址' }]"
        >
          <Input
            :value="form.sourceUrl ?? undefined"
            @update:value="form.sourceUrl = $event || null"
            :maxlength="1000"
          />
        </FormItem>
        <div class="flex gap-6">
          <FormItem label="排序">
            <InputNumber
              :value="form.sortOrder ?? undefined"
              @update:value="form.sortOrder = Number($event)"
              :min="0"
              :max="2147483647"
              :precision="0"
            />
          </FormItem>
          <FormItem label="启用">
            <Switch
              :checked="form.isEnabled === 1"
              @change="form.isEnabled = $event ? 1 : 0"
            />
          </FormItem>
        </div>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.cover-page {
  padding: 24px;
}
.cover-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.cover-search {
  width: 220px;
}
.cover-bank-filter {
  width: 180px;
}
.cover-filter {
  width: 120px;
}
.cover-toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
.cover-content {
  min-height: 240px;
}
.cover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 28px 24px;
  align-items: start;
}
.cover-item {
  width: 100%;
  min-width: 0;
  max-width: 320px;
}
.cover-info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 0 8px;
  margin-top: 6px;
}
.cover-info :deep(.ant-switch) {
  grid-row: 1;
  grid-column: 2;
}
.cover-name {
  grid-row: 1;
  grid-column: 1;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cover-meta {
  grid-row: 2;
  grid-column: 1 / -1;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.cover-delete {
  grid-row: 1;
  grid-column: 3;
}
@media (max-width: 767px) {
  .cover-page {
    padding: 16px;
  }
  .cover-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 20px;
  }
  .cover-search,
  .cover-bank-filter,
  .cover-filter {
    width: 100%;
    min-width: 0;
  }
  .cover-search {
    grid-column: 1 / -1;
  }
  .cover-toolbar-actions {
    justify-self: end;
  }
  .cover-toolbar-actions :deep(.ant-btn),
  .cover-delete {
    width: 44px;
    height: 44px;
  }
  .cover-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    gap: 24px 16px;
  }
}
</style>
