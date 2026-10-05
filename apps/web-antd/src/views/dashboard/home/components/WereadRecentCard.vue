<script setup lang="ts">
import type { WereadRecentBook } from '#/api/core/weread';

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import dayjs from 'dayjs';

import { getWereadRecent } from '#/api/core/weread';
import BusinessIcon from '#/components/BusinessIcon.vue';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import BookLink from '#/views/my-hub/weread/book-link.vue';

import { useHomeRequest } from '../composables/useHomeRequest';
import { findMenuChain } from './business-card-data';
import BusinessCardCover from './BusinessCardCover.vue';

const emit = defineEmits<{ visibility: [visible: boolean] }>();
const router = useRouter();
const access = useAccessStore();
const user = useUserStore();
const visuals = useMenuVisualsStore();
const locks = useSecondaryLockStore();
const books = ref<WereadRecentBook[]>([]);
const connected = ref<boolean | null>(null);
const denied = ref(false);
const identity = computed(
  () => user.userInfo?.userId || user.userInfo?.id || '',
);
const chain = computed(() =>
  findMenuChain(
    access.accessMenus,
    [],
    [],
    visuals.cardMenu('section.weread')?.menuId ?? undefined,
  ),
);
const path = computed(() => chain.value.at(-1)?.path);
const locked = computed(
  () =>
    !locks.loaded ||
    denied.value ||
    chain.value.some(
      (menu) =>
        (locks.isMenuLocked(String(menu.menuId)) &&
          !locks.isUnlocked(menu.path)) ||
        (locks.showModal && locks.pendingTargetPath === menu.path),
    ),
);
const available = computed(() => !!path.value && !access.loginExpired);
const request = useHomeRequest({
  enabled: () => available.value && !locked.value,
  fetch: getWereadRecent,
  apply: (data) => {
    books.value = data.books;
    connected.value = data.connected;
  },
  onError: (error) => {
    if (
      (error as { response?: { data?: { rscode?: string } } })?.response?.data
        ?.rscode === '2001'
    ) {
      denied.value = true;
      books.value = [];
      connected.value = null;
    }
  },
});
const { loading, loaded, failed } = request;
const visible = computed(
  () =>
    available.value &&
    (connected.value !== false || failed.value || locked.value),
);
watch(visible, (value) => emit('visibility', value), { immediate: true });
watch(
  [identity, available, locked],
  () => {
    request.invalidate();
    books.value = [];
    connected.value = null;
    loaded.value = false;
    failed.value = false;
    if (available.value && !locked.value) void request.load();
  },
  { immediate: true, flush: 'sync' },
);
watch(
  identity,
  () => {
    denied.value = false;
  },
  { flush: 'sync' },
);
watch(
  () => locks.unlockedPaths.size,
  () => {
    denied.value = false;
  },
);
void visuals.load();
void locks.loadLockedMenus();
function openPage() {
  if (path.value) void router.push(path.value);
}
function readingDate(value: string) {
  const date = dayjs(Number(value) * 1000);
  const prefix = date.isSame(dayjs(), 'day')
    ? '今天'
    : date.isSame(dayjs().subtract(1, 'day'), 'day')
      ? '昨天'
      : date.format(date.year() === dayjs().year() ? 'MM-DD' : 'YYYY-MM-DD');
  return `${prefix} ${date.format('HH:mm')}`;
}
</script>

<template>
  <section
    v-if="visible"
    class="weread-card relative flex min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground"
    aria-label="微信读书首页卡片"
    :aria-busy="loading"
  >
    <!-- 空白刷新按钮位于所有内容之下，支持键盘且不拦截书籍和标题。 -->
    <button
      type="button"
      class="weread-refresh absolute inset-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      aria-label="刷新微信读书"
      :disabled="loading || locked"
      @click.stop="request.load()"
    ></button>
    <header
      class="pointer-events-none relative flex h-11 shrink-0 items-center px-3"
    >
      <button
        type="button"
        class="pointer-events-auto flex min-h-11 items-center gap-2 text-base font-semibold hover:text-primary"
        aria-label="查看微信读书"
        @click.stop="openPage"
      >
        <BusinessIcon card-key="section.weread" class="size-4" />微信读书
      </button>
      <span
        v-if="loading"
        class="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 animate-pulse bg-primary/40 motion-reduce:animate-none"
        aria-hidden="true"
      ></span>
    </header>
    <div
      v-if="locked"
      class="weread-placeholder pointer-events-none relative flex items-center justify-center text-sm text-muted-foreground"
    >
      <button
        class="pointer-events-auto min-h-11 px-3"
        type="button"
        @click.stop="openPage"
      >
        点击解锁
      </button>
    </div>
    <div
      v-else-if="!loaded && loading"
      class="pointer-events-none relative px-3 pb-3"
      role="status"
      aria-label="正在加载最近阅读"
    >
      <div
        v-for="index in 3"
        :key="index"
        class="weread-row flex animate-pulse items-center gap-3 motion-reduce:animate-none"
      >
        <span class="weread-cover rounded bg-muted-foreground/20"></span
        ><span class="flex flex-1 flex-col gap-2"
          ><span class="h-3 w-1/2 rounded bg-muted-foreground/20"></span
          ><span class="h-2.5 w-1/3 rounded bg-muted-foreground/20"></span
          ><span class="h-1 w-full rounded bg-muted-foreground/20"></span
        ></span>
      </div>
    </div>
    <div
      v-else-if="books.length > 0"
      class="pointer-events-none relative px-3 pb-3"
    >
      <div
        v-for="book in books"
        :key="book.bookId"
        class="weread-row pointer-events-auto"
        @click.stop
      >
        <BookLink
          :book="book"
          compact
          class="flex w-full items-center gap-3 text-left hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <BusinessCardCover
            class="weread-cover"
            :url="book.cover"
            :icon="visuals.visual('section.weread').icon"
          />
          <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="truncate text-sm font-semibold" :title="book.title">{{
              book.title
            }}</span>
            <span
              class="weread-meta flex min-w-0 justify-between gap-2 text-xs text-muted-foreground"
              ><span class="truncate">{{ book.author }}</span
              ><span class="shrink-0 tabular-nums">{{
                readingDate(book.readUpdateTime)
              }}</span></span
            >
            <span class="flex items-center gap-2"
              ><span
                class="h-1 flex-1 overflow-hidden rounded bg-muted-foreground/20"
                role="progressbar"
                :aria-label="`${book.title}阅读进度`"
                :aria-valuenow="book.progress ?? undefined"
                :aria-valuemin="0"
                :aria-valuemax="100"
                ><span
                  class="block h-full rounded bg-primary"
                  :style="{
                    width: `${book.progress ?? 0}%`,
                    backgroundColor:
                      visuals.visual('section.weread').iconColor || undefined,
                  }"
                ></span></span
              ><span class="w-9 text-right text-xs tabular-nums">{{
                book.progress == null ? '—' : `${book.progress}%`
              }}</span></span
            >
          </span>
          <svg
            aria-hidden="true"
            class="size-4 shrink-0 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m9 5 7 7-7 7" />
          </svg>
        </BookLink>
      </div>
    </div>
    <div
      v-else
      class="weread-placeholder pointer-events-none relative flex items-center justify-center text-sm text-muted-foreground"
      role="status"
    >
      {{ failed ? '加载失败，点击空白处重试' : '暂无最近阅读' }}
    </div>
    <span
      v-if="failed && books.length > 0"
      class="pointer-events-none absolute right-3 top-3 text-xs text-destructive"
      role="alert"
      >刷新失败</span
    >
  </section>
</template>

<style scoped>
.weread-row {
  min-height: 72px;
  padding-block: 4px;
}
.weread-cover {
  width: 42px;
  height: 64px;
  flex-shrink: 0;
}
.weread-placeholder {
  min-height: 228px;
}
.weread-card {
  container-type: inline-size;
}
</style>
