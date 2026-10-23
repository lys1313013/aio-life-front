<script setup lang="ts">
import type {
  FinanceCalendarBucket,
  FinanceCalendarDetail,
  FinanceKind,
  FinanceRecordKind,
} from '#/api/core/finance-calendar';
import type { UserDictDataEntity } from '#/api/core/userDictType';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { Button, Pagination, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenModal } from '#/adapter/modal';
import { getFinanceCalendarDetails } from '#/api/core/finance-calendar';
import { getByDictType } from '#/api/core/userDictType';
import { AppModal } from '#/components/app-modal';
import ExpenseFormModal from '#/views/my-hub/expense/form-modal.vue';
import IncomeFormModal from '#/views/my-hub/income/form-modal.vue';

import { formatFinanceAmount as money } from './finance-calendar';

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
    row.expDesc ||
    row.counterparty ||
    row.remark ||
    dictionaryLabel(categories.value, row.incTypeId) ||
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
    row.incDate
      ? row.incDate
      : row.expTime
        ? dayjs(row.expTime).format('YYYY-MM-DD HH:mm')
        : '未填日期',
    dictionaryLabel(
      categories.value,
      displayedKind.value === 'income' ? row.incTypeId : row.expTypeId,
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
    :footer="null"
    @cancel="emit('close')"
  >
    <div class="finance-details" :aria-label="title">
      <div class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span class="text-sm text-muted-foreground">{{ period }}</span>
        <span class="text-sm tabular-nums" aria-label="范围合计">{{
          money(amount)
        }}</span>
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
      <Spin :spinning="loading">
        <div ref="listRef" class="finance-details-list" :aria-busy="loading">
          <div
            v-if="!loaded && loading"
            class="space-y-3"
            aria-label="加载中"
            role="status"
          >
            <div
              v-for="n in 3"
              :key="n"
              class="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
            ></div>
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
              class="finance-detail-edit w-full rounded text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              :aria-label="`编辑${label}：${description(row)}`"
              :disabled="loading"
              @click="edit(row)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="break-words text-sm">
                    {{ description(row) }}
                  </div>
                  <div
                    v-if="row.counterparty && row.counterparty !== row.expDesc"
                    class="mt-1 break-words text-xs text-muted-foreground"
                  >
                    {{ row.counterparty }}
                  </div>
                </div>
                <span
                  class="shrink-0 text-sm tabular-nums"
                  aria-label="记账金额"
                  >{{ row.amt == null ? '—' : money(row.amt) }}</span
                >
              </div>
              <div class="mt-1 text-xs text-muted-foreground">
                {{ metadata(row) }}
              </div>
              <div
                v-if="row.remark && row.remark !== description(row)"
                class="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground"
              >
                {{ row.remark }}
              </div>
              <div
                v-if="row.tax != null"
                class="mt-1 text-xs text-muted-foreground"
              >
                税额：{{ money(row.tax) }}
              </div>
            </button>
            <details
              v-if="
                row.transactionId ||
                row.merchantOrderNo ||
                row.transactionStatus ||
                (row.transactionAmt != null && row.transactionAmt !== row.amt)
              "
              class="mt-2 text-xs text-muted-foreground"
            >
              <summary class="cursor-pointer">交易信息</summary>
              <dl class="mt-2 space-y-1 break-all">
                <div
                  v-if="
                    row.transactionAmt != null && row.transactionAmt !== row.amt
                  "
                >
                  <dt class="inline">交易金额：</dt>
                  <dd class="inline">{{ money(row.transactionAmt) }}</dd>
                </div>
                <div v-if="row.transactionStatus">
                  <dt class="inline">状态：</dt>
                  <dd class="inline">{{ row.transactionStatus }}</dd>
                </div>
                <div v-if="row.transactionId">
                  <dt class="inline">交易号：</dt>
                  <dd class="inline">{{ row.transactionId }}</dd>
                </div>
                <div v-if="row.merchantOrderNo">
                  <dt class="inline">商家订单号：</dt>
                  <dd class="inline">{{ row.merchantOrderNo }}</dd>
                </div>
              </dl>
            </details>
          </article>
          <div v-if="failed" class="py-4 text-center" role="alert">
            <Button @click="load(targetPage)">加载失败，重试</Button>
          </div>
        </div>
      </Spin>
      <div
        v-if="loaded"
        class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
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
.finance-details-list {
  min-height: 96px;
  max-height: min(52dvh, 420px);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.finance-detail-row {
  padding: 12px 0;
}

.finance-detail-row + .finance-detail-row {
  border-top: 1px solid hsl(var(--border) / 0.5);
}
</style>
