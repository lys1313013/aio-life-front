<script setup lang="ts">
import type {
  FinanceCalendar,
  FinanceCalendarBucket,
  FinanceCalendarQuery,
  FinanceGranularity,
  FinanceKind,
  FinanceMetric,
} from '#/api/core/finance-calendar';

import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import dayjs from 'dayjs';

import { getFinanceCalendar } from '#/api/core/finance-calendar';
import BusinessIcon from '#/components/BusinessIcon.vue';
import { useMenuVisualsStore } from '#/store/menu-visuals';

import { useHomeSection } from '../composables/useHomeSection';
import CardHeader from './CardHeader.vue';
import {
  financeCalendarPlaceholder,
  financeGranularities,
  financeToday,
  formatFinanceAmount as money,
  readFinanceGranularity,
  saveFinanceGranularity,
} from './finance-calendar';
import FinanceCalendarDetailsModal from './FinanceCalendarDetailsModal.vue';

const props = defineProps<{ kind: FinanceKind; page?: boolean }>();
const emit = defineEmits<{ visibility: [visible: boolean] }>();
const label = computed(
  () => ({ income: '收入', expense: '支出', finance: '收支概览' })[props.kind],
);
const metric = ref<FinanceMetric>('balance');
const metrics = [
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' },
  { value: 'balance', label: '结余' },
] as const;
const FinanceEntry = defineAsyncComponent(
  () => import('#/views/my-hub/finance-dashboard/FinanceEntryModal.vue'),
);
const financeRef = ref<InstanceType<typeof FinanceEntry>>();
const entryMounted = ref(false);
let pendingEntry = false;
async function openEntry() {
  await nextTick();
  if (!financeRef.value || !pendingEntry || locked.value || !available.value)
    return;
  pendingEntry = false;
  financeRef.value.open(metric.value === 'income' ? 'income' : 'expense');
}
watch(financeRef, openEntry);
function addEntry() {
  entryMounted.value = true;
  pendingEntry = true;
  void openEntry();
}
function closeEntry() {
  entryMounted.value = false;
  pendingEntry = false;
}
const options = computed(() => financeGranularities(props.kind));
const user = useUserStore();
const router = useRouter();
const visuals = useMenuVisualsStore();
const identity = computed(() =>
  String(user.userInfo?.userId || user.userInfo?.id || ''),
);
const granularity = ref<FinanceGranularity>(
  readFinanceGranularity(identity.value, props.kind),
);
// 日期只在本次浏览中保留；重新打开使用当前月/年，粒度按用户保存在本地。
const cursor = ref<null | string>(null);
const selected = ref('');
const details = ref<FinanceCalendarBucket | null>(null);
watch(
  identity,
  () => {
    cursor.value = null;
    selected.value = '';
    details.value = null;
    closeEntry();
    metric.value = 'balance';
    granularity.value = readFinanceGranularity(identity.value, props.kind);
  },
  { flush: 'sync' },
);

function query(): FinanceCalendarQuery {
  const mode = granularity.value;
  const date = cursor.value || financeToday();
  return {
    granularity: mode,
    ...(mode === 'year'
      ? {}
      : { date: date.slice(0, mode === 'month' ? 4 : 7) }),
  };
}
const card = useHomeSection(props.kind, {
  fetch: async () => {
    const params = query();
    const result = await getFinanceCalendar(props.kind, params);
    if (
      result.granularity !== params.granularity ||
      (result.date ?? undefined) !== params.date
    ) {
      throw new Error(`${label.value}日历范围与请求不一致`);
    }
    return result;
  },
  requestKey: () => JSON.stringify(query()),
  isStale: (data) => {
    const result = data as FinanceCalendar;
    const params = query();
    return (
      result.granularity !== params.granularity ||
      (result.date ?? undefined) !== params.date ||
      result.today !== financeToday()
    );
  },
});
const { available, locked, loading, failed, loaded } = card;
const data = computed(() => card.data.value as FinanceCalendar | null);
const displayed = computed(
  () => data.value ?? financeCalendarPlaceholder(query()),
);
const initialLoading = computed(() => !loaded.value && loading.value);
const accent = computed(
  () =>
    visuals.visual(`section.${props.kind}`).iconColor || 'hsl(var(--primary))',
);
const dayOffset = computed(
  () => (dayjs(displayed.value.startDate).day() + 6) % 7,
);
const maxAmount = computed(() =>
  Math.max(
    1,
    ...displayed.value.buckets.map((bucket) => Math.abs(bucketAmount(bucket))),
  ),
);
const dateOptions = computed(() => {
  const mode = displayed.value.granularity;
  const current = dayjs(financeToday());
  const anchor = dayjs(displayed.value.date || current);
  // 原生选择器可快速跳转，前后箭头可继续查看更早年份。
  const firstYear = Math.min(current.year() - 10, anchor.year());
  const options: { label: string; value: string }[] = [];
  for (let year = current.year(); year >= firstYear; year--) {
    if (mode === 'month')
      options.push({ label: `${year}年`, value: `${year}` });
    else
      for (
        let month = year === current.year() ? current.month() + 1 : 12;
        month >= 1;
        month--
      ) {
        options.push({
          label: `${year}年${month}月`,
          value: `${year}-${String(month).padStart(2, '0')}`,
        });
      }
  }
  return options;
});
const canNext = computed(() => {
  const params = query();
  return (
    !!params.date &&
    params.date <
      financeToday().slice(0, params.granularity === 'month' ? 4 : 7)
  );
});
const canPrevious = computed(
  () =>
    (query().date || '') > (granularity.value === 'month' ? '1000' : '1000-01'),
);

watch(available, (value) => emit('visibility', value), { immediate: true });
watch(data, (value, previous) => {
  if (
    value?.granularity !== previous?.granularity ||
    value?.date !== previous?.date ||
    !value?.buckets.some((bucket) => bucket.key === selected.value)
  ) {
    selected.value = '';
    details.value = null;
  }
});
watch([locked, available], ([isLocked, isAvailable]) => {
  if (isLocked || !isAvailable) {
    closeDetails();
    closeEntry();
  }
});
function openDetails(bucket: FinanceCalendarBucket) {
  if (unavailable(bucket) || loading.value) return;
  selected.value = bucket.key;
  details.value = { ...bucket };
}
function closeDetails() {
  details.value = null;
  selected.value = '';
}

function selectGranularity(value: FinanceGranularity) {
  if (value === granularity.value && !failed.value) return;
  granularity.value = value;
  saveFinanceGranularity(identity.value, value, props.kind);
  if (failed.value) void card.load(true);
}
function moveDate(step: number) {
  if (granularity.value === 'year') return;
  cursor.value = dayjs(query().date)
    .add(step, granularity.value === 'month' ? 'year' : 'month')
    .format('YYYY-MM-DD');
}
function changeDate(event: Event) {
  cursor.value = dayjs((event.target as HTMLSelectElement).value).format(
    'YYYY-MM-DD',
  );
}
function rangeLabel(bucket: FinanceCalendarBucket) {
  if (!bucket.startDate || !bucket.endDate) return bucket.label;
  if (displayed.value.granularity === 'week')
    return `${dayjs(bucket.startDate).format('M月D日')}—${dayjs(bucket.endDate).subtract(1, 'day').format('D日')}`;
  return displayed.value.granularity === 'day'
    ? dayjs(bucket.startDate).format('M月D日')
    : bucket.label;
}
function bucketAmount(bucket: FinanceCalendarBucket) {
  return props.kind === 'finance' ? (bucket[metric.value] ?? 0) : bucket.amount;
}
function heat(bucket: FinanceCalendarBucket) {
  return bucketAmount(bucket) === 0
    ? undefined
    : {
        backgroundColor: `color-mix(in srgb, var(--finance-accent) ${8 + (Math.abs(bucketAmount(bucket)) / maxAmount.value) * 24}%, hsl(var(--card)))`,
      };
}
function unavailable(bucket: FinanceCalendarBucket) {
  return (
    !data.value ||
    (bucket.future && bucket.amount === 0 && !bucket.income && !bucket.expense)
  );
}
function navigate() {
  if (card.path.value) void router.push(card.path.value);
}
</script>

<template>
  <section
    v-if="available"
    class="finance-calendar-card relative min-w-0 rounded-xl border border-border bg-card text-card-foreground"
    :class="{ 'finance-calendar-page': page }"
    :aria-label="label"
    :aria-busy="loading"
    :style="{ '--finance-accent': accent }"
  >
    <CardHeader
      class="h-10 px-3"
      :label="`刷新${label}`"
      :loading="loading"
      :error="false"
      :disabled="locked"
      :refresh="() => card.load()"
    >
      <button
        type="button"
        class="flex min-h-10 min-w-0 items-center gap-2 text-base font-semibold hover:text-primary"
        @click="navigate"
      >
        <BusinessIcon :card-key="`section.${kind}`" class="size-4" />{{ label }}
      </button>
      <button
        v-if="kind === 'finance' && !locked"
        type="button"
        class="ml-auto flex size-7 items-center justify-center rounded hover:bg-muted"
        aria-label="记一笔"
        @click="addEntry"
      >
        <VbenIcon icon="mdi:plus" class="size-4" />
      </button>
      <div
        v-if="!locked"
        class="finance-calendar-tabs"
        role="group"
        :aria-label="`${label}统计粒度`"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          :aria-pressed="displayed.granularity === option.value"
          :aria-busy="loading && granularity === option.value"
          @click="selectGranularity(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </CardHeader>
    <div v-if="locked" class="flex min-h-32 items-center justify-center">
      <button
        type="button"
        class="min-h-11 px-3 text-sm text-muted-foreground"
        @click="card.unlock"
      >
        点击解锁
      </button>
    </div>
    <div v-else class="finance-calendar-body px-3">
      <div class="finance-calendar-toolbar">
        <div
          v-if="displayed.granularity !== 'year'"
          class="finance-calendar-date"
        >
          <button
            type="button"
            class="finance-calendar-arrow"
            :aria-label="
              displayed.granularity === 'month' ? '上一年' : '上个月'
            "
            :disabled="!canPrevious"
            @click="moveDate(-1)"
          >
            <VbenIcon icon="mdi:chevron-left" class="size-4" />
          </button>
          <select
            :value="displayed.date"
            class="finance-calendar-date-select"
            :aria-label="
              displayed.granularity === 'month' ? '选择年份' : '选择月份'
            "
            @change="changeDate"
          >
            <option
              v-for="option in dateOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <button
            type="button"
            class="finance-calendar-arrow"
            :aria-label="
              displayed.granularity === 'month' ? '下一年' : '下个月'
            "
            :disabled="!canNext"
            @click="moveDate(1)"
          >
            <VbenIcon icon="mdi:chevron-right" class="size-4" />
          </button>
        </div>
        <span v-else></span>
        <div
          v-if="kind !== 'finance'"
          class="finance-calendar-total tabular-nums"
          :class="{ 'animate-pulse text-muted-foreground': initialLoading }"
          aria-live="polite"
          :aria-label="`所选范围${label}合计`"
        >
          {{ data ? money(data.amount) : '—' }}
        </div>
      </div>
      <div
        v-if="kind === 'finance'"
        class="finance-calendar-metrics"
        role="group"
        aria-label="收支指标"
      >
        <button
          v-for="item in metrics"
          :key="item.value"
          type="button"
          :aria-pressed="metric === item.value"
          @click="metric = item.value"
        >
          <span>{{ item.label }}</span>
          <span class="tabular-nums">{{
            data ? money(data[item.value] ?? 0) : '—'
          }}</span>
        </button>
      </div>
      <div class="finance-calendar-content" :aria-busy="loading">
        <div
          v-if="displayed.granularity === 'day'"
          class="finance-calendar-weekdays"
          aria-hidden="true"
        >
          <span
            v-for="weekday in ['一', '二', '三', '四', '五', '六', '日']"
            :key="weekday"
            >{{ weekday }}</span
          >
        </div>
        <div
          class="finance-calendar-grid"
          :class="`finance-calendar-${displayed.granularity}`"
          :aria-label="`${displayed.label}${label}`"
        >
          <template v-if="displayed.granularity === 'day'">
            <span v-for="offset in dayOffset" :key="`blank-${offset}`"></span>
          </template>
          <button
            v-for="bucket in displayed.buckets"
            :key="bucket.key"
            type="button"
            class="finance-calendar-cell"
            :class="{
              'finance-calendar-future':
                bucket.future &&
                bucket.amount === 0 &&
                !bucket.income &&
                !bucket.expense,
              'finance-calendar-skeleton': initialLoading,
            }"
            :style="data ? heat(bucket) : undefined"
            :aria-pressed="selected === bucket.key"
            :aria-label="`${rangeLabel(bucket)}，${data ? money(bucketAmount(bucket)) : '尚未加载'}`"
            :disabled="unavailable(bucket) || loading"
            @click="openDetails(bucket)"
          >
            <span class="finance-calendar-cell-label">{{ bucket.label }}</span>
            <span
              v-if="displayed.granularity === 'week'"
              class="finance-calendar-week-range"
              >{{ rangeLabel(bucket) }}</span
            >
            <span
              class="finance-calendar-cell-amount tabular-nums"
              :class="{
                'finance-calendar-amount-long':
                  displayed.granularity === 'day' &&
                  money(bucketAmount(bucket), true).length >= 7,
              }"
              >{{
                !data ||
                (bucket.future &&
                  bucket.amount === 0 &&
                  !bucket.income &&
                  !bucket.expense) ||
                (displayed.granularity === 'day' && bucket.amount === 0)
                  ? '—'
                  : money(bucketAmount(bucket), displayed.granularity === 'day')
              }}</span
            >
          </button>
        </div>
        <div
          v-if="loading"
          class="finance-calendar-loading"
          role="status"
          aria-label="加载中"
        >
          <span class="finance-calendar-spinner" aria-hidden="true"></span>
        </div>
        <div v-else-if="failed" class="finance-calendar-initial-error">
          <button
            type="button"
            class="min-h-11 rounded-lg bg-card px-3 text-sm text-destructive shadow-sm"
            @click="card.load()"
          >
            加载失败，点击重试
          </button>
        </div>
      </div>
    </div>
    <FinanceEntry v-if="entryMounted && !locked" ref="financeRef" />
    <FinanceCalendarDetailsModal
      v-if="details && !locked"
      :key="`${identity}:${details.key}`"
      :bucket="details"
      :kind="kind"
      :initial-kind="metric === 'income' ? 'income' : 'expense'"
      @close="closeDetails"
    />
  </section>
</template>

<style scoped>
.finance-calendar-card {
  display: flex;
  flex-direction: column;
  height: 250px;
}

.finance-calendar-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 8px;
}

@media (min-width: 1024px) {
  .finance-calendar-card {
    height: 280px;
  }
}

.finance-calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  min-height: 24px;
  margin: 0 0 2px;
}

.finance-calendar-date {
  display: flex;
  align-items: center;
  min-width: 0;
}

.finance-calendar-arrow {
  display: flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  height: 24px;
  border-radius: 6px;
}

.finance-calendar-arrow:hover:not(:disabled) {
  background: hsl(var(--accent));
}

.finance-calendar-arrow:disabled {
  opacity: 0.3;
}

.finance-calendar-date-select {
  width: 92px;
  padding: 2px 0;
  font-size: 12px;
  text-align: center;
  appearance: none;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.finance-calendar-date-select option {
  color: hsl(var(--foreground));
  background: hsl(var(--card));
}

.finance-calendar-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.finance-calendar-tabs button {
  min-width: 30px;
  min-height: 26px;
  padding: 2px 8px;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  border-radius: 6px;
}

.finance-calendar-tabs button[aria-pressed='true'] {
  color: hsl(var(--foreground));
  background: hsl(var(--card));
}

.finance-calendar-total {
  min-width: 0;
  overflow-wrap: anywhere;
  margin-left: auto;
  font-size: 13px;
  text-align: right;
  font-weight: 400;
  line-height: 1.2;
}

.finance-calendar-content {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.finance-calendar-weekdays,
.finance-calendar-day {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
}

.finance-calendar-weekdays {
  flex-shrink: 0;
  margin-bottom: 2px;
  font-size: 10px;
  line-height: 14px;
  color: hsl(var(--muted-foreground));
  text-align: center;
}

.finance-calendar-grid {
  display: grid;
  flex: 1;
  grid-auto-rows: minmax(22px, 1fr);
  min-height: 0;
  overflow: auto;
  gap: 2px;
}

.finance-calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 22px;
  padding: 0 2px;
  border-radius: 7px;
}

.finance-calendar-cell[aria-pressed='true'] {
  outline: 1px solid var(--finance-accent);
  outline-offset: -1px;
}

.finance-calendar-cell-label,
.finance-calendar-week-range {
  font-size: 10px;
  line-height: 11px;
  color: hsl(var(--muted-foreground));
}

.finance-calendar-cell-amount {
  max-width: 100%;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 11px;
}

.finance-calendar-day .finance-calendar-cell-amount {
  font-size: 10px;
  white-space: nowrap;
}

.finance-calendar-day .finance-calendar-amount-long {
  font-size: 9px;
  letter-spacing: -0.5px;
}

.finance-calendar-future {
  opacity: 0.35;
}

.finance-calendar-week {
  gap: 4px;
}

.finance-calendar-week .finance-calendar-cell {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 6px;
  padding: 2px 8px;
  text-align: left;
}

.finance-calendar-week .finance-calendar-cell-amount {
  text-align: right;
}

.finance-calendar-month,
.finance-calendar-year {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.finance-calendar-year {
  grid-auto-rows: minmax(40px, max-content);
  align-content: start;
}

.finance-calendar-month .finance-calendar-cell,
.finance-calendar-year .finance-calendar-cell {
  min-height: 24px;
  gap: 2px;
}

.finance-calendar-month .finance-calendar-cell-amount,
.finance-calendar-year .finance-calendar-cell-amount {
  font-size: 12px;
}

.finance-calendar-skeleton {
  background: hsl(var(--muted) / 0.65);
}

.finance-calendar-skeleton .finance-calendar-cell-amount {
  color: transparent;
  background: hsl(var(--muted-foreground) / 0.12);
  border-radius: 3px;
  width: 65%;
}

.finance-calendar-loading,
.finance-calendar-initial-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--card) / 0.75);
}

.finance-calendar-loading {
  pointer-events: none;
  border-radius: 7px;
  background: hsl(var(--card) / 0.6);
}

.finance-calendar-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid hsl(var(--muted-foreground) / 0.2);
  border-top-color: var(--finance-accent);
  border-radius: 50%;
  animation: finance-calendar-spin 0.7s linear infinite;
}

@keyframes finance-calendar-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .finance-calendar-spinner {
    animation-duration: 2s;
  }
}

@media (max-width: 380px) {
  .finance-calendar-toolbar {
    gap: 2px;
  }

  .finance-calendar-arrow {
    flex-basis: 22px;
  }

  .finance-calendar-tabs button {
    min-width: 26px;
    padding: 4px 6px;
  }

  .finance-calendar-cell-amount {
    font-size: 11px;
  }
}

.finance-calendar-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  margin-bottom: 4px;
}

.finance-calendar-metrics button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 3px 2px;
  border-radius: 5px;
  min-width: 0;
}

.finance-calendar-metrics button[aria-pressed='true'] {
  background: hsl(var(--muted));
}

.finance-calendar-metrics button span:first-child {
  color: hsl(var(--muted-foreground));
  font-size: 10px;
}

.finance-calendar-metrics button span:last-child {
  font-size: 12px;
  overflow-wrap: anywhere;
}

.finance-calendar-page {
  height: auto;
  min-height: 360px;
}

.finance-calendar-page .finance-calendar-body {
  flex: initial;
}

.finance-calendar-page .finance-calendar-grid {
  flex: initial;
  grid-auto-rows: 56px;
}

.finance-calendar-page .finance-calendar-year {
  grid-auto-rows: 40px;
}

.finance-calendar-page .finance-calendar-metrics {
  margin-bottom: 12px;
}

.finance-calendar-page .finance-calendar-metrics button {
  padding: 8px;
}

.finance-calendar-page .finance-calendar-metrics button span:first-child {
  font-size: 12px;
}

.finance-calendar-page .finance-calendar-metrics button span:last-child {
  font-size: 14px;
}
</style>
