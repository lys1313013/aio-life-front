<script setup lang="ts">
import type { WereadRecentBook } from '#/api/core/weread';

import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import dayjs from 'dayjs';

import { getWereadRecent } from '#/api/core/weread';
import BusinessIcon from '#/components/BusinessIcon.vue';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import BookLink from '#/views/my-hub/weread/book-link.vue';

import { useHomeRequest } from '../composables/useHomeRequest';
import { BUSINESS_CARD_MAX_HEIGHT, findMenuChain } from './business-card-data';
import BusinessCardCover from './BusinessCardCover.vue';
import CardRefreshIndicator from './CardRefreshIndicator.vue';

const emit = defineEmits<{ visibility: [visible: boolean] }>();
const router = useRouter();
const access = useAccessStore();
const user = useUserStore();
const visuals = useMenuVisualsStore();
const locks = useSecondaryLockStore();
const books = ref<WereadRecentBook[]>([]);
const connected = ref<boolean | null>(null);
const denied = ref(false);
const scrollRef = ref<HTMLElement>();
const nextCursor = ref<null | string>(null);
const loadingMore = ref(false);
const moreFailed = ref(false);
let pageGeneration = 0;
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
  fetch: () => getWereadRecent(),
  onStart: () => {
    pageGeneration++;
    loadingMore.value = false;
    moreFailed.value = false;
  },
  apply: (data) => {
    books.value = data.books;
    connected.value = data.connected;
    nextCursor.value = data.nextCursor ?? null;
    void nextTick(() => {
      if (scrollRef.value) scrollRef.value.scrollTop = 0;
    });
  },
  onError: (error) => {
    if (
      (error as { response?: { data?: { code?: number } } })?.response?.data
        ?.code === 2001
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
    pageGeneration++;
    loadingMore.value = false;
    moreFailed.value = false;
    nextCursor.value = null;
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
async function loadMore() {
  const cursor = nextCursor.value;
  if (
    !cursor ||
    loading.value ||
    loadingMore.value ||
    !available.value ||
    locked.value
  )
    return;
  const version = request.version();
  const generation = ++pageGeneration;
  const valid = () =>
    request.current(version) &&
    generation === pageGeneration &&
    !locked.value &&
    available.value;
  loadingMore.value = true;
  moreFailed.value = false;
  try {
    const data = await getWereadRecent(cursor);
    if (!valid()) return;
    if (!data.connected) {
      connected.value = false;
      books.value = [];
      nextCursor.value = null;
      return;
    }
    books.value = [
      ...new Map(
        [...books.value, ...data.books].map((book) => [book.bookId, book]),
      ).values(),
    ];
    nextCursor.value =
      data.books.length > 0 && data.nextCursor !== cursor
        ? (data.nextCursor ?? null)
        : null;
  } catch (error) {
    if (!valid()) return;
    if (
      (error as { response?: { data?: { code?: number } } })?.response?.data
        ?.code === 2001
    ) {
      denied.value = true;
      books.value = [];
      nextCursor.value = null;
    } else moreFailed.value = true;
  } finally {
    if (valid()) loadingMore.value = false;
  }
}
function onScroll() {
  const element = scrollRef.value;
  if (
    element &&
    !moreFailed.value &&
    element.scrollHeight - element.scrollTop - element.clientHeight < 32
  )
    void loadMore();
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
    :style="{ '--weread-max-height': `${BUSINESS_CARD_MAX_HEIGHT}px` }"
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
      class="pointer-events-none relative flex h-11 shrink-0 items-center justify-between px-2.5 sm:px-3"
    >
      <button
        type="button"
        class="pointer-events-auto flex min-h-11 items-center gap-2 text-base font-semibold hover:text-primary"
        aria-label="查看微信读书"
        @click.stop="openPage"
      >
        <BusinessIcon card-key="section.weread" class="size-4" />微信读书
      </button>
      <CardRefreshIndicator v-if="loading && loaded && !locked" />
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
      class="weread-body weread-full pointer-events-none relative px-2.5 sm:px-3"
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
      ref="scrollRef"
      class="weread-body weread-scroll pointer-events-auto relative px-2.5 sm:px-3"
      :class="{ 'weread-full': books.length >= 3 }"
      tabindex="0"
      aria-label="最近阅读列表"
      @scroll.passive="onScroll"
      @click.stop="request.load()"
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
      <div
        v-if="loadingMore"
        class="weread-row flex animate-pulse items-center gap-3 motion-reduce:animate-none"
        role="status"
        aria-label="正在加载更多书籍"
      >
        <span class="weread-cover rounded bg-muted-foreground/20"></span>
        <span class="h-3 w-1/2 rounded bg-muted-foreground/20"></span>
      </div>
      <button
        v-else-if="moreFailed"
        type="button"
        class="flex min-h-11 w-full items-center justify-center text-sm text-destructive"
        aria-label="重试加载更多书籍"
        @click.stop="loadMore"
      >
        加载失败，点击重试
      </button>
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
  box-sizing: border-box;
  height: var(--weread-row-height);
  padding-block: var(--weread-row-inset);
}
.weread-cover {
  width: min(42px, calc(var(--weread-cover-height) * 2 / 3));
  height: var(--weread-cover-height);
  flex-shrink: 0;
}
.weread-full {
  height: var(--weread-body-height);
}
.weread-scroll {
  max-height: var(--weread-body-height);
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
}
.weread-placeholder {
  min-height: var(--weread-body-height);
}
.weread-card {
  --weread-card-height: var(--weread-max-height);
  --weread-bottom-padding: 10px;
  --weread-row-inset: 4px;
  /* 标题 44px、边框 2px；剩余内容高度均分三行，与其他业务卡片对齐。 */
  --weread-body-height: calc(
    var(--weread-card-height) - 46px - var(--weread-bottom-padding)
  );
  --weread-row-height: calc(var(--weread-body-height) / 3);
  --weread-cover-height: min(
    64px,
    calc(var(--weread-row-height) - 2 * var(--weread-row-inset))
  );

  container-type: inline-size;
  padding-bottom: var(--weread-bottom-padding);
}
@media (min-width: 640px) {
  .weread-card {
    --weread-bottom-padding: 12px;
  }
}
@media (min-width: 768px) {
  .weread-card {
    --weread-card-height: 250px;
    --weread-row-inset: 2px;
  }
}
@media (min-width: 1024px) {
  .weread-card {
    --weread-card-height: var(--weread-max-height);
    --weread-row-inset: 4px;
  }
}
</style>
