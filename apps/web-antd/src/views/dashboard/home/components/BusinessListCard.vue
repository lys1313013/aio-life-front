<script setup lang="ts">
import type { Component } from 'vue';

import type { BusinessCardItem, BusinessCardPage } from './business-card-data';

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

import { VbenIcon } from '@vben/common-ui';
import { useSortable } from '@vben/hooks';

import { Dropdown, Menu, MenuItem } from 'ant-design-vue';

import {
  BUSINESS_CARD_MAX_HEIGHT,
  goalProgressColor,
} from './business-card-data';
import BusinessCardCover from './BusinessCardCover.vue';
import BusinessCardSkeleton from './BusinessCardSkeleton.vue';
import CardHeader from './CardHeader.vue';
import ReadingShelves from './ReadingShelves.vue';

const props = defineProps<{
  dragOrder?: boolean;
  fetchPage: (page: number) => Promise<BusinessCardPage>;
  icon: Component | string;
  iconColor?: string;
  locked?: boolean;
  media?: boolean;
  readingShelves?: boolean;
  reorder?: (ids: string[]) => Promise<unknown>;
  title: string;
  unpin?: (id: string) => Promise<unknown>;
}>();
const emit = defineEmits<{
  'access-denied': [];
  add: [];
  edit: [item: BusinessCardItem];
  navigate: [];
  unlock: [];
}>();
const items = ref<BusinessCardItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref(false);
const initialized = ref(false);
const busyId = ref('');
const page = ref(0);
const hasMore = ref(false);
const orderRef = ref<HTMLElement>();
const dragging = ref(false);
const sortDisabled = computed(
  () => !props.dragOrder || props.locked || loading.value || !!busyId.value,
);
let suppressClickUntil = 0;
const scrollRef = ref<HTMLElement>();
const shelvesRef = ref<InstanceType<typeof ReadingShelves>>();
let generation = 0;
let mutation = 0;
let active = true;
let errorPage = 1;

function invalidate(clear = false) {
  generation++;
  mutation++;
  dragging.value = false;
  busyId.value = '';
  loading.value = false;
  loadingMore.value = false;
  if (clear) {
    items.value = [];
    initialized.value = false;
    error.value = false;
  }
}

async function load(reset = false) {
  if (!active || props.locked || (loading.value && !reset)) return;
  if (!reset && initialized.value && !hasMore.value && !error.value) return;
  const version = ++generation;
  const targetPage = reset ? 1 : error.value ? errorPage : page.value + 1;
  loading.value = true;
  loadingMore.value = targetPage > 1;
  error.value = false;
  try {
    const result = await props.fetchPage(targetPage);
    if (version !== generation || !active || props.locked) return;
    const merged = targetPage === 1 ? [] : items.value;
    items.value = [
      ...new Map(
        [...merged, ...result.items].map((item) => [item.id, item]),
      ).values(),
    ];
    page.value = targetPage;
    hasMore.value = result.items.length > 0 && result.hasMore;
    initialized.value = true;
  } catch (error_) {
    if (version !== generation) return;
    const failure = error_ as {
      response?: { data?: { rscode?: string }; status?: number };
    };
    if (
      failure.response?.data?.rscode === '2001' ||
      failure.response?.status === 403
    ) {
      items.value = [];
      if (failure.response?.data?.rscode === '2001') emit('access-denied');
    }
    error.value = true;
    errorPage = targetPage;
  } finally {
    if (version === generation) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
  await nextTick();
  // A short first page must not strand subsequent pages without a scroll bar.
  const el = scrollRef.value;
  if (
    !error.value &&
    hasMore.value &&
    (props.readingShelves
      ? shelvesRef.value?.needsMore()
      : el && el.scrollHeight <= el.clientHeight)
  )
    void load();
}

function onScroll() {
  if (props.readingShelves) return;
  const el = scrollRef.value;
  if (
    !error.value &&
    el &&
    el.scrollHeight - el.scrollTop - el.clientHeight < 32
  )
    void load();
}

async function act(item: BusinessCardItem, direction?: -1 | 1) {
  if (busyId.value || loading.value || props.locked) return;
  const actionVersion = ++mutation;
  const dataVersion = generation;
  const current = () =>
    actionVersion === mutation &&
    dataVersion === generation &&
    active &&
    !props.locked;
  busyId.value = item.id;
  try {
    if (direction) {
      const index = items.value.findIndex((row) => row.id === item.id);
      const ordered = [...items.value];
      const other = index + direction;
      if (other < 0 || other >= ordered.length) return;
      [ordered[index], ordered[other]] = [ordered[other]!, ordered[index]!];
      await props.reorder?.(ordered.map((row) => row.id));
      if (current()) items.value = ordered;
    } else {
      await props.unpin?.(item.id);
      if (current())
        items.value = items.value.filter((row) => row.id !== item.id);
    }
  } catch {
    // A stale ordering set may be rejected after changes on another device.
    if (current()) await load(true);
  } finally {
    if (actionVersion === mutation) busyId.value = '';
  }
}

async function saveOrder(from: number, to: number) {
  if (sortDisabled.value || !active || from === to || !props.reorder) return;
  const before = [...items.value];
  const item = before[from];
  if (!item || to < 0 || to >= before.length) return;
  const ordered = [...before];
  ordered.splice(from, 1);
  ordered.splice(to, 0, item);
  const actionVersion = ++mutation;
  const dataVersion = generation;
  const current = () =>
    actionVersion === mutation &&
    dataVersion === generation &&
    active &&
    !props.locked;
  busyId.value = item.id;
  items.value = ordered;
  try {
    await props.reorder(ordered.map((row) => row.id));
  } catch {
    if (current()) {
      items.value = before;
      await load(true);
    }
  } finally {
    if (actionVersion === mutation) busyId.value = '';
  }
}
function editItem(item: BusinessCardItem) {
  if (dragging.value || Date.now() < suppressClickUntil || busyId.value) return;
  emit('edit', item);
}
watch(
  orderRef,
  async (container, _, onCleanup) => {
    if (!container || !props.dragOrder) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;
    let ids: string[] = [];
    let version = generation;
    onCleanup(() => {
      cancelled = true;
      destroy?.();
    });
    const sortable = await useSortable(container, {
      draggable: '[data-goal-id]',
      delay: 300,
      delayOnTouchOnly: false,
      touchStartThreshold: 5,
      forceFallback: true,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 0
        : 150,
      ghostClass: 'opacity-30',
      chosenClass: 'goal-order-chosen',
      disabled: sortDisabled.value,
      onChoose() {
        dragging.value = true;
        ids = items.value.map((row) => row.id);
        version = generation;
      },
      onUnchoose() {
        if (dragging.value) suppressClickUntil = Date.now() + 450;
        dragging.value = false;
      },
      onEnd(event) {
        dragging.value = false;
        suppressClickUntil = Date.now() + 450;
        const { item, oldIndex, oldDraggableIndex, newDraggableIndex } = event;
        // Restore Sortable's DOM move before Vue applies the saved order.
        if (oldIndex !== undefined) {
          item.remove();
          container.insertBefore(item, container.children[oldIndex] ?? null);
        }
        if (
          ('originalEvent' in event &&
            event.originalEvent instanceof Event &&
            event.originalEvent.type.endsWith('cancel')) ||
          version !== generation ||
          ids.join(',') !== items.value.map((row) => row.id).join(',')
        )
          return;
        if (oldDraggableIndex !== undefined && newDraggableIndex !== undefined)
          void saveOrder(oldDraggableIndex, newDraggableIndex);
      },
    }).initializeSortable();
    if (cancelled) {
      sortable?.destroy();
      return;
    }
    const stop = watch(
      sortDisabled,
      (value) => sortable?.option('disabled', value),
      { immediate: true },
    );
    destroy = () => {
      stop();
      sortable?.destroy();
    };
  },
  { flush: 'post' },
);

function visibilityChanged() {
  if (document.visibilityState === 'visible') void load(true);
}
onMounted(() => {
  void load(true);
  document.addEventListener('visibilitychange', visibilityChanged);
});
onActivated(() => {
  if (!active) {
    active = true;
    void load(true);
  }
});
onDeactivated(() => {
  active = false;
  invalidate();
});
onBeforeUnmount(() => {
  active = false;
  invalidate();
  document.removeEventListener('visibilitychange', visibilityChanged);
});
watch(
  () => props.locked,
  (locked) => {
    invalidate(locked);
    if (!locked) void load(true);
  },
);
defineExpose({ reload: () => load(true) });
</script>

<template>
  <section
    v-if="locked || !initialized || items.length > 0 || error"
    class="business-list-card flex h-auto min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground md:h-[250px] lg:h-[280px]"
    :style="{ maxHeight: `${BUSINESS_CARD_MAX_HEIGHT}px` }"
    :aria-label="title"
  >
    <CardHeader
      class="pr-2"
      :class="media ? 'pl-5' : 'pl-3'"
      :label="`刷新${title}`"
      :loading="loading"
      :show-indicator="false"
      :disabled="locked || !!busyId"
      :refresh="() => load(true)"
    >
      <button
        type="button"
        class="flex min-h-11 min-w-0 items-center gap-2 text-base font-semibold hover:text-primary"
        @click="emit('navigate')"
      >
        <VbenIcon
          :icon="icon"
          :style="{ color: iconColor }"
          class="size-4 shrink-0"
        /><span>{{ title }}</span>
      </button>
      <div v-if="!locked" class="flex items-center">
        <span
          v-if="loading && items.length > 0 && !loadingMore"
          class="mr-1 flex h-4 items-center gap-1"
          role="status"
          aria-label="正在刷新"
        >
          <span
            v-for="dot in 3"
            :key="dot"
            class="refresh-dot size-1 rounded-full bg-muted-foreground/50"
            :style="{ animationDelay: `${(dot - 1) * 150}ms` }"
            aria-hidden="true"
          ></span>
        </span>
        <button
          type="button"
          class="card-icon"
          :aria-label="`新增${title}`"
          @click="emit('add')"
        >
          <VbenIcon icon="mdi:plus" class="size-5" />
        </button>
      </div>
    </CardHeader>
    <button
      v-if="locked"
      type="button"
      class="m-3 flex min-h-11 items-center justify-center gap-2 text-muted-foreground"
      :aria-label="`解锁${title}`"
      @click="emit('unlock')"
    >
      <VbenIcon icon="mdi:lock-outline" class="size-5" />
    </button>
    <div
      v-else
      ref="scrollRef"
      class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-2"
      :class="media ? 'px-4 pt-1' : 'px-2'"
      @scroll="onScroll"
    >
      <ReadingShelves
        v-if="readingShelves"
        ref="shelvesRef"
        :items="items"
        :icon="icon"
        :loading="loading"
        :loading-more="loadingMore"
        @edit="emit('edit', $event)"
        @more="!error && load()"
      />
      <div v-else ref="orderRef" :class="{ 'media-row-grid': media }">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="group flex min-w-0 items-center rounded-lg transition-colors hover:bg-secondary/50"
          :data-goal-id="dragOrder ? item.id : undefined"
          :class="{ 'goal-sort-row': dragOrder }"
          :aria-busy="(!!busyId && dragOrder) || busyId === item.id"
        >
          <button
            type="button"
            class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            :class="{ 'min-h-16': item.membership, 'media-row': item.media }"
            :disabled="!!busyId"
            :aria-label="`编辑${item.title}`"
            @click="editItem(item)"
            @keydown.alt.up.prevent="dragOrder && saveOrder(index, index - 1)"
            @keydown.alt.down.prevent="dragOrder && saveOrder(index, index + 1)"
          >
            <span
              v-if="item.progressPercent !== undefined"
              class="relative flex size-14 shrink-0 items-center justify-center"
              role="progressbar"
              :aria-label="`${item.title}进度`"
              :aria-valuenow="item.progressPercent"
              :aria-valuemin="0"
              :aria-valuemax="100"
            >
              <svg
                class="absolute inset-0 size-full -rotate-90"
                viewBox="0 0 64 64"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  stroke-width="4"
                  class="text-muted-foreground/20"
                />
                <circle
                  v-if="item.progressPercent > 0"
                  cx="32"
                  cy="32"
                  r="28"
                  pathLength="100"
                  :stroke-dasharray="`${item.progressPercent} 100`"
                  :stroke="goalProgressColor(item.progressPercent)"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </svg>
              <span class="text-xs font-medium tabular-nums"
                >{{ item.progressPercent }}%</span
              >
            </span>
            <BusinessCardCover
              v-else-if="item.media"
              :file-id="item.fileId"
              :url="item.coverUrl"
              :icon="icon"
            />
            <span
              v-else-if="item.emoji"
              class="w-8 shrink-0 text-center text-xl"
              >{{ item.emoji }}</span
            >
            <span
              v-else-if="item.membership"
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-muted-foreground"
            >
              <VbenIcon :icon="item.icon || icon" class="size-5" />
            </span>
            <VbenIcon
              v-else
              :icon="item.icon || icon"
              class="mx-1 size-6 shrink-0 text-muted-foreground"
            />
            <span class="min-w-0 flex-1">
              <span
                class="line-clamp-2 break-words text-sm font-medium"
                :class="item.media ? 'leading-4' : 'leading-5'"
                >{{ item.title }}</span
              >
              <span
                class="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
                :class="{ 'flex-wrap': item.progressPercent !== undefined }"
              >
                <span
                  v-if="item.media"
                  class="size-1 shrink-0 rounded-full"
                  :class="
                    item.inProgress ? 'bg-primary/70' : 'bg-muted-foreground/40'
                  "
                  aria-hidden="true"
                ></span>
                <span class="truncate">{{ item.subtitle }}</span>
                <span
                  v-if="item.dueDate"
                  class="inline-flex shrink-0 items-center gap-1 tabular-nums"
                  :aria-label="`截止 ${item.dueDate}`"
                >
                  <span class="mr-0.5" aria-hidden="true">·</span>
                  <VbenIcon
                    icon="mdi:calendar-blank-outline"
                    class="size-3.5"
                    aria-hidden="true"
                  />
                  <span>{{ item.dueDate }}</span>
                </span>
                <VbenIcon
                  v-if="item.autoRenew"
                  icon="mdi:autorenew"
                  class="size-3 shrink-0"
                  aria-label="自动续费"
                />
              </span>
              <span
                v-if="item.detail"
                class="mt-0.5 block truncate text-xs text-muted-foreground"
                >{{ item.detail }}</span
              >
            </span>
            <span
              v-if="item.badge"
              class="shrink-0 whitespace-nowrap text-xs tabular-nums"
              :class="
                item.badgeUrgent
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground'
              "
              >{{ item.badge }}</span
            >
          </button>
          <span
            v-if="dragOrder && busyId === item.id"
            role="status"
            aria-label="正在保存排序"
            class="card-icon shrink-0"
            ><VbenIcon icon="mdi:loading" class="animate-spin"
          /></span>
          <Dropdown v-if="unpin && !dragOrder" :trigger="['click']">
            <button
              type="button"
              class="card-icon shrink-0"
              :disabled="!!busyId || loading"
              :aria-label="`${item.title}操作`"
            >
              <VbenIcon
                :icon="busyId === item.id ? 'mdi:loading' : 'mdi:dots-vertical'"
                :class="{ 'animate-spin': busyId === item.id }"
              />
            </button>
            <template #overlay>
              <Menu>
                <MenuItem
                  v-if="reorder"
                  :disabled="index === 0"
                  @click="act(item, -1)"
                >
                  上移
                </MenuItem>
                <MenuItem
                  v-if="reorder"
                  :disabled="index === items.length - 1"
                  @click="act(item, 1)"
                >
                  下移
                </MenuItem>
                <MenuItem @click="act(item)">取消固定</MenuItem>
              </Menu>
            </template>
          </Dropdown>
        </div>
      </div>
      <BusinessCardSkeleton
        v-if="!readingShelves && loading && items.length === 0"
        :media="media"
        :count="media ? 6 : 3"
      />
      <BusinessCardSkeleton
        v-else-if="!readingShelves && loadingMore"
        :media="media"
        :count="1"
        label="加载更多"
      />
      <button
        v-if="error"
        type="button"
        class="flex min-h-11 w-full items-center justify-center gap-1 text-sm text-muted-foreground"
        :aria-label="`${title}加载失败，重试`"
        @click="load()"
      >
        <VbenIcon icon="mdi:refresh" class="size-4" />重试
      </button>
    </div>
  </section>
</template>

<style scoped>
.goal-sort-row {
  user-select: none;
  -webkit-touch-callout: none;
}
.goal-order-chosen {
  background: hsl(var(--accent));
  box-shadow: 0 4px 14px rgb(0 0 0 / 10%);
  cursor: grabbing;
}
.business-list-card {
  container: business-card / inline-size;
}

.media-row {
  height: 64px;
  gap: 10px;
  padding-block: 4px;
}

:deep(.media-row-grid) {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: 12px;
}

@container business-card (min-width: 380px) {
  :deep(.media-row-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.refresh-dot {
  animation: refresh-pulse 1.2s ease-in-out infinite;
}
@keyframes refresh-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .refresh-dot {
    animation: none;
  }
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: hsl(var(--muted-foreground));
}
.card-icon:hover {
  color: hsl(var(--primary));
}
.card-icon:disabled {
  cursor: wait;
  opacity: 0.5;
}
</style>
