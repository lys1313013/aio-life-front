<script setup lang="ts">
import type { WereadRecentBook } from '#/api/core/weread';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import dayjs from 'dayjs';

import { getWereadRecent } from '#/api/core/weread';
import BusinessIcon from '#/components/BusinessIcon.vue';
import { useActiveRequest } from '#/composables/useActiveRequest';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { findMenuChain } from '#/utils/menu-chain';
import BookLink from '#/views/my-hub/weread/book-link.vue';

import { BUSINESS_CARD_MAX_HEIGHT } from './business-card-data';
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
const cardRef = ref<HTMLElement>();
const scrollRef = ref<HTMLElement>();
const draggingShelf = ref(false);
let shelfPointer:
  | undefined
  | {
      id: number;
      scrollLeft: number;
      x: number;
      y: number;
    };
let suppressShelfClick = false;

function startShelfDrag(event: PointerEvent) {
  suppressShelfClick = false;
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  const element = scrollRef.value;
  if (!element || element.scrollWidth <= element.clientWidth) return;
  shelfPointer = {
    id: event.pointerId,
    scrollLeft: element.scrollLeft,
    x: event.clientX,
    y: event.clientY,
  };
}
function moveShelfDrag(event: PointerEvent) {
  const element = scrollRef.value;
  if (!element || shelfPointer?.id !== event.pointerId) return;
  if (event.buttons !== 1) {
    endShelfDrag(event);
    return;
  }
  const dx = event.clientX - shelfPointer.x;
  const dy = event.clientY - shelfPointer.y;
  if (!draggingShelf.value) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      shelfPointer = undefined;
      return;
    }
    draggingShelf.value = true;
    suppressShelfClick = true;
    element.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  element.scrollLeft = shelfPointer.scrollLeft - dx;
}
function endShelfDrag(event: PointerEvent) {
  if (shelfPointer?.id !== event.pointerId) return;
  shelfPointer = undefined;
  draggingShelf.value = false;
}
function guardShelfClick(event: MouseEvent) {
  // 拖动结束产生的 click 不能打开书籍或触发空白刷新；键盘点击仍然可用。
  if (suppressShelfClick && event.detail > 0) {
    event.preventDefault();
    event.stopPropagation();
    suppressShelfClick = false;
  }
}
const wideShelf = ref(false);
const rows = computed(() => (wideShelf.value ? 2 : 1));
const columns = computed(() => {
  const result: WereadRecentBook[][] = [];
  for (let index = 0; index < books.value.length; index += rows.value) {
    result.push(books.value.slice(index, index + rows.value));
  }
  return result;
});
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
const request = useActiveRequest({
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
      if (scrollRef.value) scrollRef.value.scrollLeft = 0;
      fillViewport();
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
    void nextTick(fillViewport);
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
function fillViewport() {
  const element = scrollRef.value;
  if (
    element &&
    element.clientWidth > 0 &&
    nextCursor.value &&
    !loading.value &&
    !loadingMore.value &&
    !moreFailed.value &&
    element.scrollWidth <= element.clientWidth + 1
  )
    void loadMore();
}
function onScroll() {
  const element = scrollRef.value;
  if (
    element &&
    !moreFailed.value &&
    element.scrollWidth - element.scrollLeft - element.clientWidth < 32
  )
    void loadMore();
}
function updateShelfMode() {
  const width = cardRef.value?.getBoundingClientRect().width ?? 0;
  if (width <= 0) return;
  const nextMode = width >= 400;
  if (wideShelf.value !== nextMode) {
    wideShelf.value = nextMode;
    if (scrollRef.value) scrollRef.value.scrollLeft = 0;
  }
  void nextTick(fillViewport);
}
let resizeObserver: ResizeObserver | undefined;
watch(
  cardRef,
  (element) => {
    resizeObserver?.disconnect();
    if (!element) return;
    updateShelfMode();
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver ??= new ResizeObserver(updateShelfMode);
      resizeObserver.observe(element);
    }
  },
  { flush: 'post' },
);
onMounted(() => {
  window.addEventListener('resize', updateShelfMode);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', updateShelfMode);
});
function readingDate(value: string) {
  const date = dayjs(Number(value) * 1000);
  const prefix = date.isSame(dayjs(), 'day')
    ? ''
    : date.isSame(dayjs().subtract(1, 'day'), 'day')
      ? '昨天'
      : date.format(date.year() === dayjs().year() ? 'MM-DD' : 'YYYY-MM-DD');
  return `${prefix ? `${prefix} ` : ''}${date.format('HH:mm')}`;
}
</script>

<template>
  <section
    v-if="visible"
    ref="cardRef"
    class="weread-card relative flex min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground"
    :class="{ 'weread-card-wide': wideShelf }"
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
      class="weread-body weread-loading pointer-events-none relative"
      role="status"
      aria-label="正在加载最近阅读"
    >
      <div class="weread-track" aria-hidden="true">
        <div
          v-for="column in wideShelf ? 2 : 3"
          :key="column"
          class="weread-column"
        >
          <div
            v-for="row in rows"
            :key="row"
            class="weread-book animate-pulse motion-reduce:animate-none"
          >
            <span class="weread-cover rounded bg-muted-foreground/20"></span>
            <span class="weread-content">
              <span class="h-3 w-4/5 rounded bg-muted-foreground/20"></span>
              <span class="h-2.5 w-3/5 rounded bg-muted-foreground/20"></span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div
      v-else-if="books.length > 0"
      ref="scrollRef"
      class="weread-body weread-scroll pointer-events-auto relative"
      :class="{ 'weread-dragging': draggingShelf }"
      tabindex="0"
      aria-label="最近阅读列表"
      @pointerdown.stop="startShelfDrag"
      @pointermove="moveShelfDrag"
      @pointerup="endShelfDrag"
      @pointercancel="endShelfDrag"
      @lostpointercapture="endShelfDrag"
      @mousedown.stop
      @touchstart.stop
      @dragstart.prevent
      @scroll.passive="onScroll"
      @click.capture="guardShelfClick"
      @click.stop="request.load()"
    >
      <div class="weread-track">
        <div
          v-for="column in columns"
          :key="column[0]!.bookId"
          class="weread-column"
        >
          <div
            v-for="book in column"
            :key="book.bookId"
            class="weread-book pointer-events-auto"
            @click.stop
          >
            <BookLink
              :book="book"
              compact
              class="weread-book-link hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <BusinessCardCover
                class="weread-cover"
                natural-ratio
                :url="book.cover"
                :icon="visuals.visual('section.weread').icon"
              />
              <span class="weread-content">
                <span class="weread-title truncate" :title="book.title">{{
                  book.title
                }}</span>
                <span class="weread-meta text-muted-foreground">
                  <span
                    class="shrink-0 tabular-nums"
                    :aria-label="`${book.title}阅读进度`"
                    >{{
                      book.progress == null ? '—' : `${book.progress}%`
                    }}</span
                  >
                  <span class="min-w-0 truncate tabular-nums">{{
                    readingDate(book.readUpdateTime)
                  }}</span>
                </span>
              </span>
            </BookLink>
          </div>
        </div>
        <div v-if="loadingMore || moreFailed" class="weread-status">
          <span
            v-if="loadingMore"
            class="block h-3 w-4/5 animate-pulse rounded bg-muted-foreground/20 motion-reduce:animate-none"
            role="status"
            aria-label="正在加载更多书籍"
          ></span>
          <button
            v-else
            type="button"
            class="min-h-11 text-sm text-destructive"
            aria-label="重试加载更多书籍"
            @click.stop="loadMore"
          >
            加载失败，点击重试
          </button>
        </div>
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
.weread-card {
  box-sizing: border-box;

  --weread-card-height: 240px;
  --weread-body-height: calc(var(--weread-card-height) - 58px);
  --weread-columns: 3;
  --weread-gap: 12px;
  --weread-cover-height: min(144px, calc(var(--weread-body-height) - 62px));

  height: var(--weread-card-height);
  padding-bottom: 12px;
  overflow: hidden;
}

.weread-body {
  height: var(--weread-body-height);
  min-height: 0;
}

.weread-scroll {
  overflow: auto hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  user-select: none;
}

.weread-dragging,
.weread-dragging :deep(*) {
  cursor: grabbing;
}

.weread-scroll::-webkit-scrollbar {
  display: none;
}

.weread-loading {
  overflow: hidden;
}

.weread-placeholder {
  min-height: var(--weread-body-height);
}

.weread-track {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: 100%;
  gap: var(--weread-gap);
  padding-inline: 12px;
}

.weread-column {
  display: flex;
  flex: 0 0
    calc(
      (100% - var(--weread-gap) * (var(--weread-columns) - 1)) /
        var(--weread-columns)
    );
  flex-direction: column;
  min-width: 0;
}

.weread-book {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  min-height: 0;
  min-width: 0;
}

.weread-card :deep(.weread-book-link) {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
}

.weread-card :deep(.weread-book-link .ant-spin) {
  position: absolute;
  top: 0;
  right: 0;
}

.weread-cover {
  width: min(calc(var(--weread-cover-height) * 2 / 3), 100%);
  height: var(--weread-cover-height);
  flex-shrink: 0;
}

.weread-content {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.weread-title {
  display: block;
  max-width: 100%;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}

.weread-meta {
  display: flex;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 400;
  line-height: 16px;
  white-space: nowrap;
}

.weread-status {
  display: flex;
  min-width: 160px;
  height: 100%;
  flex: 0 0 160px;
  align-items: center;
  justify-content: center;
}

.weread-card-wide {
  --weread-columns: 2;
  --weread-cover-height: min(
    104px,
    calc((var(--weread-body-height) - 8px) / 2)
  );
}

.weread-card-wide .weread-column {
  gap: 8px;
}

.weread-card-wide :deep(.weread-book-link) {
  height: 100%;
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
  text-align: left;
}

.weread-card-wide .weread-content {
  flex: 1;
  align-items: flex-start;
}

.weread-card-wide .weread-meta {
  justify-content: flex-start;
}

.weread-card-wide .weread-title {
  width: 100%;
}

@media (min-width: 640px) {
  .weread-card {
    --weread-card-height: 250px;
  }
}

@media (min-width: 1024px) {
  .weread-card {
    --weread-card-height: var(--weread-max-height);
  }
}
</style>
