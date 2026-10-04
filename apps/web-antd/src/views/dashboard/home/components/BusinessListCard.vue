<script setup lang="ts">
import type { Component } from 'vue';

import type { BusinessCardItem, BusinessCardPage } from './business-card-data';

import {
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

import { VbenIcon } from '@vben/common-ui';

import { Dropdown, Menu, MenuItem } from 'ant-design-vue';

import { BUSINESS_CARD_MAX_HEIGHT } from './business-card-data';
import BusinessCardCover from './BusinessCardCover.vue';
import BusinessCardSkeleton from './BusinessCardSkeleton.vue';
import CardHeader from './CardHeader.vue';

const props = defineProps<{
  fetchPage: (page: number) => Promise<BusinessCardPage>;
  icon: Component | string;
  iconColor?: string;
  locked?: boolean;
  media?: boolean;
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
const scrollRef = ref<HTMLElement>();
let generation = 0;
let mutation = 0;
let active = true;
let errorPage = 1;

function invalidate(clear = false) {
  generation++;
  mutation++;
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
  if (!error.value && hasMore.value && el && el.scrollHeight <= el.clientHeight)
    void load();
}

function onScroll() {
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
      class="pl-3 pr-1"
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
      class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2"
      @scroll="onScroll"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="group flex min-w-0 items-center rounded-lg transition-colors hover:bg-secondary/50"
        :aria-busy="busyId === item.id"
      >
        <button
          type="button"
          class="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          :class="{ 'min-h-16': item.membership }"
          :disabled="!!busyId"
          :aria-label="`编辑${item.title}`"
          @click="emit('edit', item)"
        >
          <BusinessCardCover
            v-if="item.media"
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
              class="line-clamp-2 break-words text-sm font-medium leading-5"
              >{{ item.title }}</span
            >
            <span
              class="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
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
        <Dropdown v-if="unpin" :trigger="['click']">
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
      <BusinessCardSkeleton
        v-if="loading && items.length === 0"
        :media="media"
        :count="3"
      />
      <BusinessCardSkeleton
        v-else-if="loadingMore"
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
