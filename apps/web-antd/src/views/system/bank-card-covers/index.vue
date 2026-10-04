<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type { BankOption } from '#/api/bank-card';
import type { CoverTemplate } from '#/api/bank-card/covers';
import type { ApiRequests } from '#/api/payload';

import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

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
const loadingBanks = ref(true);
const items = ref<CoverTemplate[]>([]);
const failed = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(true);
const sentinel = ref<HTMLElement>();
const grid = ref<HTMLElement>();
const pageSize = ref(24);
const placeholderCount = computed(() =>
  loadingMore.value || (loading.value && items.value.length === 0)
    ? pageSize.value
    : 0,
);
let page = 0;
let observer: IntersectionObserver | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const open = ref(false);
const saving = ref(false);
const uploading = ref(false);
const busy = ref<Record<string, 'delete' | 'toggle' | undefined>>({});
const bankFilter = ref<string>();
const enabledFilter = ref<number>();
const search = ref('');
const typeFilter = ref<string>();
const editing = ref<CoverTemplate>();
const editingInUse = computed(() => Number(editing.value?.usageCount ?? 0) > 0);
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
let generation = 0;
let mutationVersion = 0;
let disposed = false;
let active = true;
const mutations = new Map<string, { item?: CoverTemplate; version: number }>();

function recordMutation(id: string, item?: CoverTemplate) {
  mutations.set(id, { item, version: ++mutationVersion });
}

function observeBottom() {
  observer?.disconnect();
  if (active && sentinel.value && hasMore.value && !failed.value) {
    observer?.observe(sentinel.value);
  }
}

function measurePageSize() {
  if (!grid.value) return 24;
  const style = getComputedStyle(grid.value);
  const tracks = style.gridTemplateColumns.match(/[\d.]+px/g);
  if (!tracks?.length) return 24;
  const columns = tracks.length;
  const cardWidth = Math.min(Number.parseFloat(tracks[0]!), 320);
  // 图片比例与下方信息区的高度，首屏额外预取一行。
  const rowHeight =
    cardWidth / 1.586 + 70 + (Number.parseFloat(style.rowGap) || 0);
  const visibleHeight = Math.max(
    0,
    window.innerHeight - grid.value.getBoundingClientRect().top,
  );
  const rows = Math.max(
    Math.ceil(24 / columns),
    Math.ceil(visibleHeight / rowHeight) + 1,
  );
  return Math.min(rows, Math.floor(100 / columns)) * columns;
}

async function load(reset = true) {
  if (disposed || !active) return;
  if (reset) {
    clearTimeout(searchTimer);
    generation++;
    page = 0;
    // 同一轮分页固定大小，避免窗口变化后偏移量改变而漏掉卡面。
    pageSize.value = measurePageSize();
    hasMore.value = true;
    loadingMore.value = false;
  } else if (loading.value || loadingMore.value || !hasMore.value) {
    return;
  }
  const request = generation;
  const nextPage = reset ? 1 : page + 1;
  const version = mutationVersion;
  if (reset) loading.value = true;
  else loadingMore.value = true;
  failed.value = false;
  try {
    const result = await listCoverTemplates({
      page: nextPage,
      size: pageSize.value,
      keyword: search.value.trim() || undefined,
      bankId: bankFilter.value,
      cardType: typeFilter.value,
      isEnabled: enabledFilter.value,
    });
    if (disposed || request !== generation) return;
    const latest = new Map(
      (reset ? [] : items.value).map((item) => [item.id, item]),
    );
    for (const item of result.items) latest.set(item.id, item);
    // 保留该查询发出后已成功的写入，避免慢响应复活删除项或回滚启停状态。
    for (const [id, mutation] of mutations) {
      if (mutation.version <= version) continue;
      if (mutation.item) latest.set(id, mutation.item);
      else latest.delete(id);
    }
    items.value = [...latest.values()];
    page = nextPage;
    hasMore.value =
      result.items.length === pageSize.value &&
      BigInt(nextPage * pageSize.value) < BigInt(result.total);
  } catch {
    if (!disposed && request === generation) failed.value = true;
  } finally {
    if (!disposed && request === generation) {
      loading.value = false;
      loadingMore.value = false;
      await nextTick();
      observeBottom();
    }
  }
}
function resetFilters(delay = 0) {
  clearTimeout(searchTimer);
  generation++;
  page = 0;
  items.value = [];
  failed.value = false;
  loadingMore.value = false;
  loading.value = true;
  observer?.disconnect();
  if (delay) searchTimer = setTimeout(() => void load(), delay);
  else void load();
}
watch([bankFilter, typeFilter, enabledFilter], () => resetFilters());
watch(search, () => resetFilters(250));
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
  if (disposed) return;
  recordMutation(item.id, item);
  items.value = [...items.value.filter((row) => row.id !== item.id), item];
}
async function save() {
  if (saving.value || uploading.value) return;
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  if (saving.value || uploading.value) return;
  saving.value = true;
  try {
    replace(await saveCoverTemplate(form.value, editing.value?.id));
    open.value = false;
  } finally {
    saving.value = false;
  }
}
async function toggle(item: CoverTemplate) {
  if (busy.value[item.id]) return;
  busy.value[item.id] = 'toggle';
  try {
    replace(await setCoverEnabled(item.id, item.isEnabled === 1 ? 0 : 1));
  } finally {
    delete busy.value[item.id];
  }
}
async function remove(item: CoverTemplate) {
  if (busy.value[item.id]) return;
  busy.value[item.id] = 'delete';
  try {
    await deleteCoverTemplate(item.id);
    if (disposed) return;
    recordMutation(item.id);
    items.value = items.value.filter((row) => row.id !== item.id);
  } finally {
    delete busy.value[item.id];
  }
}
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !failed.value) {
        void load(false);
      }
    },
    { rootMargin: '120px' },
  );
  void load();
  void listCoverBanks()
    .then((result) => {
      if (!disposed) banks.value = result;
    })
    .catch(() => {})
    .finally(() => {
      if (!disposed) loadingBanks.value = false;
    });
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  clearTimeout(searchTimer);
  observer?.disconnect();
});
onDeactivated(() => {
  active = false;
  generation++;
  clearTimeout(searchTimer);
  loading.value = false;
  loadingMore.value = false;
  observer?.disconnect();
});
onActivated(() => {
  if (!active) {
    active = true;
    void load();
  }
});
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
        :loading="loadingBanks"
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
        <Button aria-label="刷新卡面" :loading="loading" @click="load()">
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
    <Spin :spinning="loading && items.length > 0">
      <div class="cover-content">
        <Empty
          v-if="!failed && !loading && filtered.length === 0"
          description="暂无卡面"
        />
        <div
          ref="grid"
          class="cover-grid"
          :aria-busy="loading || loadingMore"
          aria-label="银行卡面列表"
        >
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
              <CoverPreview
                :file-id="item.fileId"
                :public-url="item.publicUrl"
                :name="item.name"
              />
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
                :loading="busy[item.id] === 'toggle'"
                :disabled="!!busy[item.id]"
                :aria-label="`${item.isEnabled ? '停用' : '启用'}${item.name}`"
                @change="toggle(item)"
              />
              <Popconfirm
                :title="`删除${item.name}？`"
                :disabled="Number(item.usageCount) > 0 || !!busy[item.id]"
                @confirm="remove(item)"
              >
                <Button
                  type="text"
                  danger
                  :aria-label="`删除${item.name}`"
                  class="cover-delete"
                  :disabled="Number(item.usageCount) > 0 || !!busy[item.id]"
                  :loading="busy[item.id] === 'delete'"
                >
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Popconfirm>
            </div>
          </div>
          <div
            v-for="index in placeholderCount"
            :key="`placeholder-${index}`"
            class="cover-placeholder"
            aria-hidden="true"
          >
            <div class="cover-placeholder-image"></div>
            <div class="cover-placeholder-name"></div>
            <div class="cover-placeholder-meta"></div>
          </div>
        </div>
        <div ref="sentinel" class="cover-load-status">
          <Button
            v-if="failed"
            aria-label="重试加载卡面"
            @click="load(page === 0)"
          >
            加载失败，重试
          </Button>
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
      :cancel-button-props="{ disabled: saving }"
      :closable="!saving"
      :mask-closable="!saving"
      :keyboard="!saving"
      @ok="save"
    >
      <Form ref="formRef" :model="form" layout="vertical" :disabled="saving">
        <div class="mx-auto mb-4 max-w-80">
          <CoverPreview
            :file-id="form.fileId || undefined"
            :public-url="
              form.fileId === editing?.fileId ? editing?.publicUrl : undefined
            "
            :name="form.name || '卡面预览'"
          />
          <FormItem
            name="fileId"
            :rules="[{ required: true, message: '请上传卡面图片' }]"
          >
            <CoverPicker
              :active="open && !saving"
              :file-id="form.fileId || undefined"
              :public-url="
                form.fileId === editing?.fileId ? editing?.publicUrl : undefined
              "
              :upload-fn="uploadTemplateCover"
              @change="form.fileId = $event || ''"
              @pending="uploading = $event"
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
              :disabled="editingInUse"
            />
          </FormItem>
          <FormItem label="银行卡类型" name="cardType">
            <Select
              :value="form.cardType ?? undefined"
              @update:value="form.cardType = String($event)"
              :options="types"
              :disabled="editingInUse"
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
  color: hsl(var(--foreground));
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
.cover-load-status {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
}
.cover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 28px 24px;
  align-items: start;
}
.cover-item,
.cover-placeholder {
  width: 100%;
  min-width: 0;
  max-width: 320px;
}
.cover-placeholder-image,
.cover-placeholder-name,
.cover-placeholder-meta {
  border-radius: 6px;
  background: hsl(var(--muted) / 50%);
}
.cover-placeholder-image {
  aspect-ratio: 1.586;
  border-radius: 12px;
}
.cover-placeholder-name {
  width: 65%;
  height: 18px;
  margin-top: 19px;
}
.cover-placeholder-meta {
  width: 80%;
  height: 14px;
  margin-top: 13px;
  margin-bottom: 6px;
}
.cover-info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 2px 12px;
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
  min-width: 0;
  color: hsl(var(--foreground));
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
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
  width: 44px;
  height: 44px;
}
@media (hover: hover) and (pointer: fine) {
  .cover-delete {
    opacity: 0;
    pointer-events: none;
  }
  .cover-delete.ant-btn-loading,
  .cover-item:hover .cover-delete,
  .cover-item:focus-within .cover-delete {
    opacity: 1;
    pointer-events: auto;
  }
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
  .cover-toolbar-actions :deep(.ant-btn) {
    width: 44px;
    height: 44px;
  }
  .cover-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    gap: 24px 16px;
  }
}
</style>
