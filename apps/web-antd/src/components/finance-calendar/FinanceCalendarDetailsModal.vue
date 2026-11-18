<script setup lang="ts">
import type {
  FinanceCalendarBucket,
  FinanceCalendarDetail,
  FinanceKind,
  FinanceRecordKind,
} from '#/api/core/finance-calendar';
import type { UserDictDataEntity } from '#/api/core/userDictType';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { CloseOutlined } from '@ant-design/icons-vue';
import { Button, Pagination, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenModal } from '#/adapter/modal';
import { getFinanceCalendarDetails } from '#/api/core/finance-calendar';
import { getByDictType } from '#/api/core/userDictType';
import { AppModal } from '#/components/app-modal';
import { formatFinanceAmount as money } from '#/components/finance-calendar/finance-calendar';
import ExpenseFormModal from '#/components/finance-entry/ExpenseFormModal.vue';
import IncomeFormModal from '#/components/finance-entry/IncomeFormModal.vue';

const props = defineProps<{
  bucket: FinanceCalendarBucket;
  initialKind?: FinanceRecordKind;
  kind: FinanceKind;
}>();
const emit = defineEmits<{ close: [] }>();
const [ExpenseModal, expenseApi] = useVbenModal({
  connectedComponent: ExpenseFormModal,
});
const [IncomeModal, incomeApi] = useVbenModal({
  connectedComponent: IncomeFormModal,
});
function edit(row: FinanceCalendarDetail) {
  if (loading.value) return;
  const api = displayedKind.value === 'expense' ? expenseApi : incomeApi;
  api.setData({ values: { ...row } }).open();
}
function saved() {
  void load(page.value, false);
}
const activeKind = ref<FinanceRecordKind>(
  props.kind === 'finance' ? (props.initialKind ?? 'expense') : props.kind,
);
const displayedKind = ref(activeKind.value);
const label = computed(() =>
  displayedKind.value === 'income' ? '收入' : '支出',
);
const title = computed(() =>
  props.kind === 'finance' ? '收支明细' : `${label.value}明细`,
);
const amount = computed(() =>
  props.kind === 'finance'
    ? (props.bucket[displayedKind.value] ?? 0)
    : props.bucket.amount,
);
function changeKind(kind: FinanceRecordKind) {
  activeKind.value = kind;
  void load(1);
}
const rows = ref<FinanceCalendarDetail[]>([]);
function rowAmount(row: FinanceCalendarDetail) {
  return displayedKind.value === 'income'
    ? row.grossAmount
    : row.bookkeepingAmount;
}
const listRef = ref<HTMLDivElement>();
const page = ref(1);
const pageSize = 20;
const total = ref<null | number>(null);
const paginationTotal = computed(
  () =>
    total.value ??
    (page.value - 1) * pageSize +
      rows.value.length +
      (rows.value.length === pageSize ? 1 : 0),
);
function description(row: FinanceCalendarDetail) {
  return (
    row.expenseDesc ||
    row.counterparty ||
    row.remark ||
    dictionaryLabel(categories.value, row.incomeTypeId) ||
    '未填写描述'
  );
}
const loaded = ref(false);
const loading = ref(false);
const failed = ref(false);
let targetPage = 1;
let generation = 0;
let alive = true;
const dictionaries = new Map<
  FinanceRecordKind,
  [UserDictDataEntity[], UserDictDataEntity[]]
>();
const categories = ref<UserDictDataEntity[]>([]);
const payments = ref<UserDictDataEntity[]>([]);
const period = computed(() => {
  const { startDate, endDate } = props.bucket;
  if (!startDate || !endDate) return props.bucket.label;
  const start = dayjs(startDate).format('YYYY年M月D日');
  const end = dayjs(endDate).subtract(1, 'day').format('YYYY年M月D日');
  return start === end ? start : `${start} — ${end}`;
});
function dictionaryLabel(items: UserDictDataEntity[], id?: null | string) {
  const item = items.find((entry) => entry.id === id);
  return item?.dictLabel || item?.label || '';
}
function metadata(row: FinanceCalendarDetail) {
  return [
    row.incomeDate
      ? row.incomeDate
      : row.expenseTime
        ? dayjs(row.expenseTime).format('YYYY-MM-DD HH:mm')
        : '未填日期',
    dictionaryLabel(
      categories.value,
      displayedKind.value === 'income' ? row.incomeTypeId : row.expenseTypeId,
    ),
    dictionaryLabel(payments.value, row.payTypeId),
  ]
    .filter(Boolean)
    .join(' · ');
}
async function load(next = page.value, resetScroll = true) {
  const stamp = ++generation;
  const requestedKind = activeKind.value;
  targetPage = next;
  loading.value = true;
  failed.value = false;
  try {
    const [result, dicts] = await Promise.all([
      getFinanceCalendarDetails(requestedKind, props.bucket, next, pageSize),
      dictionaries.get(requestedKind) ??
        Promise.all([
          getByDictType(
            requestedKind === 'income' ? 'income_type' : 'exp_type',
          ),
          requestedKind === 'income'
            ? Promise.resolve({ dictDetailList: [] })
            : getByDictType('pay_type'),
        ]).then(
          ([types, pays]) =>
            [types.dictDetailList, pays.dictDetailList] as [
              UserDictDataEntity[],
              UserDictDataEntity[],
            ],
        ),
    ]);
    if (!alive || stamp !== generation) return;
    if (next > 1 && result.items.length === 0) {
      void load(next - 1, resetScroll);
      return;
    }
    dictionaries.set(requestedKind, dicts);
    displayedKind.value = requestedKind;
    [categories.value, payments.value] = dicts;
    rows.value = result.items;
    total.value = result.total;
    page.value = next;
    loaded.value = true;
    await nextTick();
    if (resetScroll && alive && stamp === generation && listRef.value)
      listRef.value.scrollTop = 0;
  } catch {
    if (alive && stamp === generation) failed.value = true;
  } finally {
    if (alive && stamp === generation) loading.value = false;
  }
}
onMounted(() => load());
onBeforeUnmount(() => {
  alive = false;
  generation++;
});
</script>

<template>
  <AppModal
    :open="true"
    :title="title"
    :width="640"
    :footer="false"
    :body-style="{ padding: '20px', overflow: 'hidden' }"
    @cancel="emit('close')"
  >
    <div class="finance-details" :aria-label="title">
      <header class="mb-4 flex items-center justify-between gap-3">
        <h2 class="m-0 text-base font-semibold">{{ title }}</h2>
        <button
          type="button"
          class="finance-details-close flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="关闭"
          @click="emit('close')"
        >
          <CloseOutlined aria-hidden="true" />
        </button>
      </header>
      <div class="finance-details-summary">
        <span class="min-w-0 text-xs text-muted-foreground">{{ period }}</span>
        <div class="flex shrink-0 items-baseline gap-2">
          <span class="text-xs text-muted-foreground">{{ label }}合计</span>
          <span
            class="text-2xl font-semibold tabular-nums"
            aria-label="范围合计"
          >
            {{ money(amount) }}
          </span>
        </div>
      </div>
      <div
        v-if="kind === 'finance'"
        class="mb-3 flex gap-2"
        role="group"
        aria-label="明细类型"
      >
        <button
          v-for="item in [
            { value: 'income', label: '收入' },
            { value: 'expense', label: '支出' },
          ] as const"
          :key="item.value"
          type="button"
          class="rounded px-3 py-1 text-sm"
          :class="
            displayedKind === item.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground'
          "
          :aria-pressed="displayedKind === item.value"
          :aria-busy="loading && activeKind === item.value"
          @click="changeKind(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <Spin :spinning="loading" class="finance-details-loading">
        <div ref="listRef" class="finance-details-list" :aria-busy="loading">
          <div
            v-if="!loaded && loading"
            class="finance-details-skeleton"
            aria-label="加载中"
            role="status"
          >
            <div
              v-for="n in 7"
              :key="n"
              class="finance-detail-placeholder animate-pulse motion-reduce:animate-none"
            >
              <div class="flex items-center justify-between gap-6">
                <span class="h-4 w-2/5 rounded bg-muted"></span>
                <span class="h-4 w-16 rounded bg-muted"></span>
              </div>
              <div class="mt-3 h-3 w-3/5 rounded bg-muted"></div>
            </div>
          </div>
          <div
            v-else-if="loaded && rows.length === 0"
            class="py-12 text-center text-sm text-muted-foreground"
          >
            暂无{{ label }}记录
          </div>
          <article
            v-for="row in rows"
            :key="row.id"
            class="finance-detail-row"
            :data-finance-id="row.id"
          >
            <button
              type="button"
              class="finance-detail-edit w-full rounded-lg text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              :aria-label="`编辑${label}：${description(row)}`"
              :disabled="loading"
              @click="edit(row)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="break-words text-sm font-[450]">
                    {{ description(row) }}
                  </div>
                  <div
                    v-if="row.counterparty && row.counterparty !== row.expenseDesc"
                    class="mt-1 break-words text-xs text-muted-foreground"
                  >
                    {{ row.counterparty }}
                  </div>
                </div>
                <span
                  class="shrink-0 text-sm font-[450] tabular-nums"
                  aria-label="记账金额"
                  >{{
                    rowAmount(row) == null ? '—' : money(rowAmount(row) ?? 0)
                  }}</span
                >
              </div>
              <div
                class="mt-1.5 break-words text-xs leading-5 text-muted-foreground"
              >
                {{ metadata(row) }}
              </div>
              <div
                v-if="row.remark && row.remark !== description(row)"
                class="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground"
              >
                {{ row.remark }}
              </div>
              <div
                v-if="row.taxAmount != null"
                class="mt-1.5 break-words text-xs leading-5 text-muted-foreground"
              >
                税额：{{ money(row.taxAmount) }}
              </div>
            </button>
          </article>
          <div v-if="failed" class="py-4 text-center" role="alert">
            <Button @click="load(targetPage)">加载失败，重试</Button>
          </div>
        </div>
      </Spin>
      <div
        v-if="loaded"
        class="finance-details-pagination flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
      >
        <span v-if="total !== null">共 {{ total }} 笔</span>
        <span v-else>本页 {{ rows.length }} 笔</span>
        <Pagination
          v-if="paginationTotal > pageSize"
          :current="page"
          :page-size="pageSize"
          :total="paginationTotal"
          :disabled="loading"
          :show-size-changer="false"
          simple
          @change="(next) => load(next)"
        />
      </div>
    </div>
  </AppModal>
  <ExpenseModal @saved="saved" @deleted="saved" />
  <IncomeModal @saved="saved" @deleted="saved" />
</template>

<style scoped>
.finance-details {
  display: flex;
  max-height: calc(100dvh - 80px);
  flex-direction: column;
  color: hsl(var(--card-foreground));
}

.finance-details > header,
.finance-details-summary,
.finance-details-pagination {
  flex-shrink: 0;
}

.finance-details-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding-bottom: 16px;
}

.finance-details-loading,
.finance-details-loading :deep(.ant-spin-container) {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.finance-details-list {
  min-height: min(120px, 30dvh);
  max-height: min(52dvh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.finance-details-list::-webkit-scrollbar {
  width: 6px;
}

.finance-details-list::-webkit-scrollbar-track {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.finance-details-list::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.25);
  background-clip: padding-box;
  border: 1px solid transparent;
  border-radius: 999px;
}

.finance-details-list:hover::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.45);
}

.finance-details-list::-webkit-scrollbar-button {
  display: none;
}

@supports not selector(::-webkit-scrollbar) {
  .finance-details-list {
    scrollbar-color: hsl(var(--muted-foreground) / 0.25) transparent;
    scrollbar-width: thin;
  }

  .finance-details-list:hover {
    scrollbar-color: hsl(var(--muted-foreground) / 0.45) transparent;
  }
}

.finance-detail-edit,
.finance-detail-placeholder {
  padding: 12px 8px;
}

.finance-detail-row + .finance-detail-row {
  border-top: 1px solid hsl(var(--border) / 0.4);
}

.finance-details-pagination {
  padding-top: 16px;
}

@media (max-width: 479px) {
  .finance-details-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
