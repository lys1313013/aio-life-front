<script setup lang="ts">
import type { HomeSectionKind, HomeSections } from '#/api/core/home-sections';

import { computed, defineAsyncComponent, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { VbenIcon } from '@vben/common-ui';

import dayjs from 'dayjs';

import { isFinancialSection } from '#/api/core/home-sections';
import BusinessIcon from '#/components/BusinessIcon.vue';

import { useHomeSection } from '../composables/useHomeSection';
import CardHeader from './CardHeader.vue';
import FinancialPeriodSelector from './FinancialPeriodSelector.vue';
import SummaryMediaThumbnail from './SummaryMediaThumbnail.vue';

const props = defineProps<{ kind: HomeSectionKind }>();
const emit = defineEmits<{ visibility: [visible: boolean] }>();
const MemoEditor = defineAsyncComponent(
  () => import('#/views/my-hub/memo/MemoEditorModal.vue'),
);
const FinanceEntry = defineAsyncComponent(
  () => import('#/views/my-hub/finance-dashboard/FinanceEntryModal.vue'),
);
const router = useRouter();
const card = useHomeSection(props.kind);
const { data, loaded, loading, failed, available, locked } = card;
const titles = {
  memo: '最近笔记',
  finance: '收支概览',
  income: '收入',
  expense: '支出',
  video: '视频续看',
  device: '我的设备',
};
const title = titles[props.kind];
const memo = computed(() =>
  props.kind === 'memo' ? (data.value as HomeSections['memo'] | null) : null,
);
const financial = isFinancialSection(props.kind);
const finance = computed(() =>
  financial
    ? (data.value as HomeSections['expense' | 'finance' | 'income'] | null)
    : null,
);
const financialMetrics = computed(() => {
  const value = finance.value;
  if (!value) return [];
  return 'income' in value
    ? [
        { label: '收入', value: value.income },
        { label: '支出', value: value.expense },
        { label: '结余', value: value.balance },
      ]
    : [{ label: title, value: value.amount }];
});
const video = computed(() =>
  props.kind === 'video' ? (data.value as HomeSections['video'] | null) : null,
);
const device = computed(() =>
  props.kind === 'device'
    ? (data.value as HomeSections['device'] | null)
    : null,
);
const empty = computed(
  () => data.value && 'items' in data.value && data.value.items.length === 0,
);
const memoOpen = ref(false);
const memoId = ref<string>();
const financeRef = ref<InstanceType<typeof FinanceEntry>>();
const financeMounted = ref(false);
let pendingEntry = false;
async function openFinanceEntry() {
  await nextTick();
  if (!financeRef.value || !pendingEntry || locked.value) return;
  pendingEntry = false;
  financeRef.value.open(props.kind === 'income' ? 'income' : 'expense');
}
watch(financeRef, openFinanceEntry);

watch(available, (value) => emit('visibility', value), { immediate: true });
watch(card.identity, () => {
  memoOpen.value = false;
  memoId.value = undefined;
  financeMounted.value = false;
  pendingEntry = false;
});
watch(locked, (value) => {
  if (value) {
    memoOpen.value = false;
    financeMounted.value = false;
    pendingEntry = false;
  }
});
function navigate() {
  if (card.path.value) void router.push(card.path.value);
}
function openRecord(id: string) {
  if (card.path.value)
    void router.push({ path: card.path.value, query: { id } });
}
function editMemo(id?: string) {
  if (locked.value) return;
  memoId.value = id;
  memoOpen.value = true;
}
function add() {
  if (props.kind === 'memo') editMemo();
  else {
    financeMounted.value = true;
    pendingEntry = true;
    openFinanceEntry();
  }
}
function money(value: null | number) {
  return value == null
    ? '—'
    : value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
function modified(value: null | string) {
  return value && dayjs(value).isValid()
    ? dayjs(value).format('MM-DD HH:mm')
    : '—';
}
function resumeUrl(url: null | string) {
  if (!url) return undefined;
  try {
    const value = new URL(url);
    return value.protocol === 'https:' &&
      (value.hostname === 'bilibili.com' ||
        value.hostname.endsWith('.bilibili.com'))
      ? value.href
      : undefined;
  } catch {
    return undefined;
  }
}
</script>

<template>
  <section
    v-if="available"
    class="summary-home-card relative flex min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground"
    :aria-label="title"
    :aria-busy="loading"
  >
    <CardHeader
      class="h-11 px-3"
      :label="`刷新${title}`"
      :loading="loading"
      :error="failed"
      :disabled="locked"
      :refresh="() => card.load()"
    >
      <button
        type="button"
        class="flex min-h-11 min-w-0 items-center gap-2 text-base font-semibold hover:text-primary"
        @click="navigate"
      >
        <BusinessIcon :card-key="`section.${kind}`" class="size-4" />{{ title }}
      </button>
      <button
        v-if="!locked && (kind === 'memo' || financial)"
        type="button"
        class="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-accent"
        :aria-label="
          kind === 'memo'
            ? '新增笔记'
            : kind === 'finance'
              ? '记一笔'
              : `新增${title}`
        "
        @click="add"
      >
        <VbenIcon icon="mdi:plus" class="size-5" />
      </button>
    </CardHeader>
    <div class="summary-body min-h-0 overflow-y-auto px-3 pb-3">
      <div
        v-if="locked"
        class="summary-placeholder flex items-center justify-center"
      >
        <button
          type="button"
          class="min-h-11 px-3 text-sm text-muted-foreground"
          @click="card.unlock"
        >
          点击解锁
        </button>
      </div>
      <div
        v-else-if="!loaded && loading"
        class="summary-skeleton"
        :class="{
          'summary-finance': financial,
          'summary-finance-single': kind === 'income' || kind === 'expense',
        }"
        role="status"
        aria-label="加载中"
      >
        <template v-if="kind === 'video' || kind === 'device'">
          <div
            v-for="row in 3"
            :key="row"
            class="summary-row flex min-w-0 items-center gap-2 py-1.5"
            aria-hidden="true"
          >
            <span
              class="h-11 shrink-0 animate-pulse rounded-md bg-muted-foreground/20"
              :style="{ width: kind === 'video' ? '72px' : '44px' }"
            ></span>
            <span class="flex min-w-0 flex-1 flex-col gap-1"
              ><span
                class="h-4 w-4/5 animate-pulse rounded bg-muted-foreground/20"
              ></span
              ><span
                class="h-3 w-2/5 animate-pulse rounded bg-muted-foreground/20"
              ></span
            ></span>
          </div>
        </template>
        <template v-else>
          <div
            v-for="row in financial && kind !== 'finance' ? 1 : 3"
            :key="row"
            class="summary-row flex flex-col justify-center gap-2 py-3"
            aria-hidden="true"
          >
            <span
              class="h-4 w-4/5 animate-pulse rounded bg-muted-foreground/20"
            ></span
            ><span
              class="h-3 w-2/5 animate-pulse rounded bg-muted-foreground/20"
            ></span>
          </div>
        </template>
      </div>
      <div
        v-else-if="!loaded || empty"
        class="summary-placeholder flex items-center justify-center text-sm text-muted-foreground"
      >
        <span v-if="!failed">{{
          kind === 'memo'
            ? '暂无笔记'
            : kind === 'video'
              ? '暂无进行中的视频'
              : '暂无在用设备'
        }}</span>
        <button v-else class="min-h-11 px-3" type="button" @click="card.load()">
          加载失败，点击重试
        </button>
      </div>
      <template v-else>
        <div
          v-if="finance"
          class="summary-finance grid gap-2"
          :class="kind === 'finance' ? 'grid-cols-3' : 'grid-cols-1'"
        >
          <div
            v-for="metric in financialMetrics"
            :key="metric.label"
            class="flex min-w-0 flex-col justify-center gap-2 py-3"
          >
            <span
              v-if="kind === 'finance'"
              class="text-xs text-muted-foreground"
              >{{ metric.label }}</span
            >
            <span
              class="break-all font-medium tabular-nums"
              :class="kind === 'finance' ? 'text-lg' : 'text-3xl'"
              >{{ money(metric.value) }}</span
            >
          </div>
          <span
            class="text-xs text-muted-foreground"
            :class="{ 'col-span-3': kind === 'finance' }"
            >{{ finance.label }} · 元</span
          >
        </div>
        <button
          v-for="item in memo?.items"
          :key="item.id"
          type="button"
          class="summary-row flex w-full min-w-0 items-center gap-2 rounded-lg py-3 text-left hover:bg-secondary/50"
          :aria-label="`编辑笔记：${item.title || '无标题'}`"
          @click="editMemo(item.id)"
        >
          <span class="min-w-0 flex-1"
            ><span class="line-clamp-2 break-words text-sm font-medium">{{
              item.title || '无标题'
            }}</span
            ><span class="mt-1 block text-xs text-muted-foreground">{{
              modified(item.updateTime)
            }}</span></span
          ><VbenIcon
            v-if="item.hiddenContent"
            icon="mdi:eye-off-outline"
            class="size-4 shrink-0 text-muted-foreground"
            aria-label="正文已隐藏"
          />
        </button>
        <div
          v-for="item in video?.items"
          :key="item.id"
          class="summary-row flex min-w-0 items-center gap-2 py-1.5"
        >
          <SummaryMediaThumbnail
            kind="video"
            :record-id="item.id"
            :file-id="item.coverFileId"
            :state="item.coverState"
            :title="item.title || '未命名视频'"
          />
          <a
            v-if="resumeUrl(item.resumeUrl)"
            :href="resumeUrl(item.resumeUrl)"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0 flex-1 rounded-lg hover:text-primary"
            :aria-label="`继续观看：${item.title || '未命名视频'}`"
            ><span
              class="line-clamp-2 break-words text-sm font-medium leading-4"
              >{{ item.title || '未命名视频' }}</span
            ><span class="mt-1 block text-xs text-muted-foreground"
              >第 {{ item.currentEpisode }} / {{ item.episodes }} 集 ·
              {{ item.progressPercent }}%</span
            ></a
          ><button
            v-else
            type="button"
            class="min-w-0 flex-1 text-left"
            @click="openRecord(item.id)"
          >
            <span class="line-clamp-2 break-words text-sm leading-4">{{
              item.title || '未命名视频'
            }}</span
            ><span class="mt-1 block text-xs text-muted-foreground"
              >第 {{ item.currentEpisode }} / {{ item.episodes }} 集 ·
              {{ item.progressPercent }}%</span
            >
          </button>
        </div>
        <div
          v-for="item in device?.items"
          :key="item.id"
          class="summary-row flex min-w-0 items-center gap-2 py-1.5"
        >
          <SummaryMediaThumbnail
            kind="device"
            :record-id="item.id"
            :file-id="item.fileId"
            :title="item.name || '未命名设备'"
          />
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left hover:bg-secondary/50"
            @click="openRecord(item.id)"
          >
            <span class="min-w-0 flex-1"
              ><span
                class="line-clamp-2 break-words text-sm font-medium leading-4"
                >{{ item.name || '未命名设备' }}</span
              ><span class="mt-1 block text-xs text-muted-foreground">{{
                item.usageDays == null
                  ? '未填写购买日期'
                  : `使用 ${item.usageDays} 天`
              }}</span></span
            >
            <span class="shrink-0 text-xs tabular-nums text-muted-foreground"
              >{{ money(item.dailyCost) }} 元/天</span
            >
          </button>
        </div>
      </template>
    </div>
    <FinancialPeriodSelector
      v-if="financial && !locked"
      :title="title"
      :value="card.displayedPeriod.value"
      :pending="card.period.value"
      :loading="loading"
      @select="card.selectPeriod"
    />
    <MemoEditor
      v-if="kind === 'memo' && memoOpen"
      v-model:open="memoOpen"
      :memo-id="memoId"
    />
    <FinanceEntry
      v-if="financial && financeMounted && !locked"
      :key="String(card.identity.value)"
      ref="financeRef"
      :kind="kind === 'income' || kind === 'expense' ? kind : undefined"
    />
  </section>
</template>

<style scoped>
.summary-row {
  min-height: 64px;
}
.summary-placeholder {
  min-height: 64px;
}
.summary-finance {
  min-height: 116px;
}
.summary-skeleton.summary-finance {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.summary-skeleton.summary-finance-single {
  grid-template-columns: minmax(0, 1fr);
}
.summary-home-card {
  max-height: 280px;
}
@media (min-width: 768px) {
  .summary-skeleton.summary-finance-single {
    grid-template-columns: minmax(0, 1fr);
  }
  .summary-home-card {
    height: 250px;
  }
  .summary-body {
    flex: 1;
  }
}
@media (min-width: 1024px) {
  .summary-skeleton.summary-finance-single {
    grid-template-columns: minmax(0, 1fr);
  }
  .summary-home-card {
    height: 280px;
  }
}
</style>
