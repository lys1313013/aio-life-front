<script setup lang="ts">
import type { BankCard, BankOption, CardTag } from '#/api/bank-card';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Dropdown,
  Empty,
  Input,
  Menu,
  MenuItem,
  message,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  deleteCard,
  deleteTag,
  listBanks,
  listCards,
  listTags,
  revealNumber,
  saveTag,
} from '#/api/bank-card';
import { AppModal as Modal } from '#/components/app-modal';

import CardEditor from './card-editor.vue';
import CardFace from './card-face.vue';
import { filterCards, STATUS_OPTIONS } from './model';

const cards = ref<BankCard[]>([]);
const banks = ref<BankOption[]>([]);
const tags = ref<CardTag[]>([]);
const loading = ref(true);
const failed = ref(false);
const keyword = ref('');
const bankId = ref<string>();
const cardType = ref('all');
const status = ref<string>();
const filterTags = ref<string[]>([]);
const editorOpen = ref(false);
const editing = ref<BankCard>();
const deleting = ref('');
const menuCardId = ref('');
const deleteConfirmId = ref('');
const numberBusy = ref('');
const numbers = ref<Record<string, string>>({});
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const visibleCards = computed(() =>
  filterCards(
    cards.value,
    keyword.value,
    bankId.value,
    cardType.value === 'all' ? undefined : cardType.value,
    status.value,
    filterTags.value,
  ),
);
const tagManager = ref(false);
const tagBusy = ref('');
const tagName = ref('');
const tagColor = ref('#64748b');
const editingTag = ref<string>();
const bankOptions = computed(() => [
  ...banks.value.map((b) => ({ label: b.name, value: b.id })),
  ...[
    ...new Set(
      cards.value
        .filter((card) => !card.bankId)
        .map((card) => card.customBankName),
    ),
  ]
    .filter((name): name is string => !!name)
    .map((name) => ({ label: name, value: `custom:${name}` })),
]);
const tagOptions = computed(() =>
  tags.value.map((t) => ({ label: t.name, value: t.id })),
);
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    [cards.value, banks.value, tags.value] = await Promise.all([
      listCards(),
      listBanks(),
      listTags(),
    ]);
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
function openEditor(card?: BankCard) {
  if (card && deleting.value === card.id) return;
  menuCardId.value = '';
  deleteConfirmId.value = '';
  clearNumbers();
  editing.value = card;
  editorOpen.value = true;
}
function saved(card: BankCard) {
  const index = cards.value.findIndex((c) => c.id === card.id);
  if (index === -1) cards.value.push(card);
  else cards.value[index] = card;
}
function upsertTag(tag: CardTag) {
  const i = tags.value.findIndex((t) => t.id === tag.id);
  if (i === -1) tags.value.push(tag);
  else tags.value[i] = tag;
  cards.value.forEach((card) => {
    card.tags = card.tags.map((t) => (t.id === tag.id ? tag : t));
  });
}
async function cardAction(card: BankCard, action: string) {
  menuCardId.value = '';
  if (action === 'delete') {
    await nextTick();
    deleteConfirmId.value = card.id;
  } else {
    await numberAction(card, action === 'copy');
  }
}
async function remove(card: BankCard) {
  deleting.value = card.id;
  try {
    await deleteCard(card.id);
    cards.value = cards.value.filter((c) => c.id !== card.id);
    hideNumber(card.id);
    deleteConfirmId.value = '';
  } finally {
    deleting.value = '';
  }
}
function hideNumber(id: string) {
  delete numbers.value[id];
  clearTimeout(timers.get(id));
  timers.delete(id);
}
function clearNumbers() {
  visibilityVersion++;
  for (const id of Object.keys(numbers.value)) hideNumber(id);
}
let alive = true;
let visibilityVersion = 0;
async function numberAction(card: BankCard, copy = false) {
  if (!copy && numbers.value[card.id]) {
    hideNumber(card.id);
    return;
  }
  numberBusy.value = card.id;
  const version = visibilityVersion;
  try {
    const number = await revealNumber(card.id);
    if (!alive || document.hidden || version !== visibilityVersion) return;
    if (copy) {
      try {
        await navigator.clipboard.writeText(number);
        message.success('已复制');
      } catch {
        message.error('复制失败，请查看后手动复制');
      }
    } else {
      numbers.value[card.id] = number;
      timers.set(
        card.id,
        setTimeout(() => hideNumber(card.id), 15_000),
      );
    }
  } finally {
    numberBusy.value = '';
  }
}
function visibilityChanged() {
  if (document.hidden) {
    visibilityVersion++;
    clearNumbers();
  }
}
function editTag(tag?: CardTag) {
  editingTag.value = tag?.id;
  tagName.value = tag?.name || '';
  tagColor.value = tag?.color || '#64748b';
}
async function submitTag() {
  if (!tagName.value.trim()) return;
  tagBusy.value = editingTag.value || 'new';
  try {
    const old = tags.value.find((t) => t.id === editingTag.value);
    upsertTag(
      await saveTag(
        {
          name: tagName.value.trim(),
          color: tagColor.value,
          status: old?.status || '0',
        },
        editingTag.value,
      ),
    );
    editTag();
  } finally {
    tagBusy.value = '';
  }
}
async function toggleTag(tag: CardTag) {
  tagBusy.value = tag.id;
  try {
    upsertTag(
      await saveTag(
        {
          name: tag.name,
          color: tag.color,
          status: tag.status === '0' ? '1' : '0',
        },
        tag.id,
      ),
    );
  } finally {
    tagBusy.value = '';
  }
}
async function removeTag(tag: CardTag) {
  tagBusy.value = tag.id;
  try {
    await deleteTag(tag.id);
    tags.value = tags.value.filter((t) => t.id !== tag.id);
    cards.value.forEach((card) => {
      card.tags = card.tags.filter((t) => t.id !== tag.id);
    });
    filterTags.value = filterTags.value.filter((id) => id !== tag.id);
    if (editingTag.value === tag.id) editTag();
  } finally {
    tagBusy.value = '';
  }
}
onMounted(() => {
  load();
  document.addEventListener('visibilitychange', visibilityChanged);
});
onBeforeUnmount(() => {
  alive = false;
  clearNumbers();
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>
<template>
  <main class="bank-page">
    <div class="toolbar">
      <Segmented
        v-model:value="cardType"
        :options="[
          { label: '全部', value: 'all' },
          { label: '储蓄卡', value: 'debit' },
          { label: '信用卡', value: 'credit' },
        ]"
      /><Input
        v-model:value="keyword"
        allow-clear
        placeholder="搜索名称或尾号"
        class="search"
      >
        <template #prefix><SearchOutlined /></template>
      </Input>
      <div class="heading-actions">
        <Button
          type="text"
          aria-label="管理标签"
          @click="
            tagManager = true;
            editTag();
          "
        >
          <TagsOutlined />
        </Button>
        <Button
          type="primary"
          aria-label="添加银行卡"
          :disabled="loading || failed"
          @click="openEditor()"
        >
          <PlusOutlined />
        </Button>
      </div>
    </div>
    <div class="filters">
      <Select
        v-model:value="bankId"
        :options="bankOptions"
        show-search
        option-filter-prop="label"
        allow-clear
        placeholder="全部银行"
      /><Select
        v-model:value="status"
        :options="STATUS_OPTIONS"
        allow-clear
        placeholder="全部状态"
      /><Select
        v-if="tags.length > 0"
        v-model:value="filterTags"
        :options="tagOptions"
        mode="multiple"
        :max-tag-count="1"
        allow-clear
        placeholder="标签"
      />
    </div>
    <Spin :spinning="loading">
      <div v-if="failed" class="empty-state">
        <Empty description="加载失败">
          <Button @click="load">重试</Button>
        </Empty>
      </div>
      <div
        v-else-if="!loading && visibleCards.length === 0"
        class="empty-state"
      >
        <Empty
          :description="cards.length > 0 ? '没有匹配的银行卡' : '还没有银行卡'"
        >
          <Button
            v-if="cards.length === 0"
            type="primary"
            @click="openEditor()"
          >
            添加银行卡
          </Button>
        </Empty>
      </div>
      <div v-else class="card-grid">
        <article
          v-for="card in visibleCards"
          :key="card.id"
          class="bank-item"
          :aria-label="
            card.cardNoLast4
              ? `${card.bankName} 尾号 ${card.cardNoLast4}`
              : card.bankName
          "
        >
          <CardFace
            role="button"
            :tabindex="deleting === card.id ? -1 : 0"
            :aria-label="`编辑银行卡：${card.alias || card.cardName || card.bankName}${card.cardNoLast4 ? ` 尾号 ${card.cardNoLast4}` : ''}`"
            :aria-disabled="deleting === card.id"
            class="cursor-pointer rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            :bank-name="card.bankName"
            :bank-code="card.bankCode"
            :card-name="card.cardName"
            :card-type="card.cardType"
            :color="card.coverColor"
            :file-id="card.coverTemplateFileId || card.coverFileIds[0]"
            @click="openEditor(card)"
            @keydown.enter.self.prevent="openEditor(card)"
            @keydown.space.self.prevent="openEditor(card)"
          >
            <template #number>
              <span v-if="card.cardNoLast4" class="card-number">{{
                numbers[card.id]?.replace(/(.{4})/g, '$1 ').trim() ||
                [card.cardNoFirst4, '••••', card.cardNoLast4]
                  .filter(Boolean)
                  .join(' ')
              }}</span>
            </template>
            <template #actions>
              <div class="card-actions" @click.stop>
                <Popconfirm
                  :open="deleteConfirmId === card.id"
                  :title="
                    card.cardNoLast4
                      ? `删除尾号 ${card.cardNoLast4} 的银行卡？`
                      : `删除${card.alias || card.cardName || card.bankName}的银行卡？`
                  "
                  placement="topRight"
                  :ok-button-props="{ loading: deleting === card.id }"
                  :cancel-button-props="{ disabled: deleting === card.id }"
                  @open-change="
                    (open) => {
                      if (!open && deleting !== card.id) deleteConfirmId = '';
                    }
                  "
                  @confirm="remove(card)"
                  @cancel="deleteConfirmId = ''"
                >
                  <Dropdown
                    :open="menuCardId === card.id"
                    :trigger="['click']"
                    placement="bottomRight"
                    :disabled="
                      numberBusy === card.id ||
                      deleting === card.id ||
                      deleteConfirmId === card.id
                    "
                    @open-change="
                      (open) => {
                        menuCardId = open ? card.id : '';
                      }
                    "
                  >
                    <Button
                      type="text"
                      size="small"
                      aria-label="银行卡更多操作"
                      aria-haspopup="menu"
                      :aria-expanded="menuCardId === card.id"
                      :loading="numberBusy === card.id || deleting === card.id"
                    >
                      <EllipsisOutlined />
                    </Button>
                    <template #overlay>
                      <Menu @click="({ key }) => cardAction(card, String(key))">
                        <MenuItem v-if="card.cardNoLast4" key="number">
                          <template #icon>
                            <EyeInvisibleOutlined
                              v-if="numbers[card.id]"
                            /><EyeOutlined v-else />
                          </template>
                          {{ numbers[card.id] ? '隐藏卡号' : '查看卡号' }}
                        </MenuItem>
                        <MenuItem v-if="card.cardNoLast4" key="copy">
                          <template #icon><CopyOutlined /></template>
                          复制卡号
                        </MenuItem>
                        <MenuItem key="delete" danger>
                          <template #icon><DeleteOutlined /></template>
                          删除银行卡
                        </MenuItem>
                      </Menu>
                    </template>
                  </Dropdown>
                </Popconfirm>
              </div>
            </template>
            <template
              v-if="
                card.alias ||
                card.coverTemplateId ||
                card.coverFileIds.length > 0 ||
                card.status !== 'normal'
              "
              #caption
            >
              <div class="card-title">
                <span>{{
                  card.alias ||
                  (card.coverTemplateId || card.coverFileIds.length > 0
                    ? card.bankName
                    : '')
                }}</span
                ><span
                  v-if="card.status !== 'normal'"
                  class="status-label"
                  :class="`status-${card.status}`"
                  >{{
                    STATUS_OPTIONS.find((s) => s.value === card.status)?.label
                  }}</span
                >
              </div>
            </template>
          </CardFace>
          <div v-if="card.tags.length > 0" class="card-info">
            <div class="tag-list">
              <Tag
                v-for="tag in card.tags"
                :key="tag.id"
                :bordered="false"
                :style="{
                  '--tag-color': tag.color || '#64748b',
                }"
              >
                {{ tag.name }}
              </Tag>
            </div>
          </div>
        </article>
      </div>
    </Spin>
    <CardEditor
      v-model:open="editorOpen"
      :card="editing"
      :banks="banks"
      :tags="tags"
      @saved="saved"
      @tag-created="upsertTag"
    />
    <Modal
      v-model:open="tagManager"
      title="标签"
      centered
      :width="440"
      :footer="null"
    >
      <div class="tag-form">
        <input v-model="tagColor" type="color" aria-label="标签颜色" /><Input
          v-model:value="tagName"
          :maxlength="20"
          placeholder="标签名称"
          @press-enter="submitTag"
        /><Button
          type="primary"
          :loading="!!tagBusy"
          :disabled="!tagName.trim()"
          @click="submitTag"
        >
          {{ editingTag ? '保存' : '添加' }}
        </Button>
        <Button v-if="editingTag" type="text" @click="editTag()">取消</Button>
      </div>
      <div v-for="tag in tags" :key="tag.id" class="tag-management-row">
        <Tag :color="tag.color || undefined">{{ tag.name }}</Tag>
        <div class="tag-management-actions">
          <Switch
            size="small"
            :checked="tag.status === '0'"
            :loading="tagBusy === tag.id"
            :disabled="!!tagBusy && tagBusy !== tag.id"
            :aria-label="tag.status === '0' ? '停用标签' : '启用标签'"
            @change="toggleTag(tag)"
          />
          <Button
            type="text"
            size="small"
            aria-label="编辑标签"
            :disabled="!!tagBusy"
            @click="editTag(tag)"
          >
            <EditOutlined />
          </Button>
          <Popconfirm
            title="删除标签并移除所有卡片上的关联？"
            :ok-button-props="{ loading: tagBusy === tag.id }"
            @confirm="removeTag(tag)"
          >
            <Button
              type="text"
              size="small"
              aria-label="删除标签"
              :disabled="!!tagBusy"
            >
              <DeleteOutlined />
            </Button>
          </Popconfirm>
        </div>
      </div>
      <Empty
        v-if="tags.length === 0"
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        description="暂无标签"
      />
    </Modal>
  </main>
</template>
<style scoped>
.bank-page {
  padding: 28px 32px 44px;
  max-width: 1540px;
  margin: 0 auto;
  color: hsl(var(--foreground));
}
.heading-actions,
.toolbar,
.card-actions,
.card-title,
.tag-management-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag-management-row {
  display: flex;
  align-items: center;
}
.heading-actions {
  gap: 6px;
}
.heading-actions :deep(.ant-btn) {
  width: 32px;
  padding-inline: 0;
}
.toolbar {
  justify-content: space-between;
  gap: 16px;
}
.search {
  width: 260px;
  margin-left: auto;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 16px 0 26px;
}
.filters > :deep(.ant-select) {
  width: 150px;
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px 26px;
  min-height: 200px;
}
.bank-item {
  min-width: 0;
  max-width: 440px;
}
.card-info {
  padding: 13px 3px 0;
}
.card-title {
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
  min-height: 20px;
}
.card-title > span:first-child {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.status-label {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  flex-shrink: 0;
}
.status-lost,
.status-frozen {
  color: #bc7832;
}
.card-number {
  font-variant-numeric: tabular-nums;
  font-size: clamp(12px, 1.1vw, 16px);
  letter-spacing: 0.07em;
  overflow-wrap: anywhere;
}
.card-actions :deep(.ant-btn) {
  color: inherit;
  width: 32px;
  height: 32px;
}
.card-actions :deep(.ant-btn:hover),
.card-actions :deep(.ant-btn:focus-visible) {
  color: inherit;
  background: rgb(255 255 255 / 16%);
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}
.tag-list :deep(.ant-tag) {
  color: var(--tag-color);
  background: color-mix(in srgb, var(--tag-color) 9%, transparent);
  margin: 0;
  padding-inline: 7px;
  border-radius: 5px;
  font-size: 11px;
}
:global(.dark) .tag-list :deep(.ant-tag) {
  color: color-mix(in srgb, var(--tag-color) 55%, #fff);
}
.empty-state {
  display: grid;
  min-height: 320px;
  place-items: center;
}
.tag-form {
  display: flex;
  gap: 8px;
  margin: 20px 0;
  align-items: center;
}
.tag-form input[type='color'] {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  flex-shrink: 0;
  cursor: pointer;
}
.tag-management-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag-management-row {
  justify-content: space-between;
  padding: 8px 0;
}
@media (min-width: 1600px) {
  .card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .bank-page {
    padding: 22px 20px 36px;
  }
  .card-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 25px 20px;
  }
  .toolbar {
    flex-wrap: wrap;
  }
  .search {
    width: 100%;
    order: 1;
  }
}
@media (max-width: 420px) {
  .bank-page {
    padding: 18px 16px 30px;
  }
  .card-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .filters {
    gap: 8px;
  }
  .filters > :deep(.ant-select) {
    width: calc(50% - 4px);
  }
}
@media (prefers-reduced-motion: no-preference) {
  .bank-item :deep(.card-face) {
    transition: box-shadow 0.2s ease;
  }
  .bank-item:hover :deep(.card-face) {
    box-shadow: 0 10px 28px #00000014;
  }
}
</style>
