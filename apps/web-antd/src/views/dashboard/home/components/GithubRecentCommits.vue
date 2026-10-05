<script lang="ts" setup>
import type { GithubCommitVO } from '#/api/core/github';

import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { Skeleton } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getRecentCommitsApi } from '#/api/core/github';

import { useHomeRequest } from '../composables/useHomeRequest';

const PAGE_SIZE = 10;

const commits = ref<GithubCommitVO[]>([]);

const loadingMore = ref(false);
const moreFailed = ref(false);

const finished = ref(false);
const page = ref(1);
const scrollRoot = ref<HTMLElement | null>(null);
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function appendCommits(incoming: GithubCommitVO[]) {
  const existingIds = new Set(commits.value.map((item) => item.id));
  commits.value = [
    ...commits.value,
    ...incoming.filter((item) => !item.id || !existingIds.has(item.id)),
  ];
}

async function loadPage() {
  if (
    !request.current(request.version()) ||
    loading.value ||
    finished.value ||
    loadingMore.value
  )
    return;
  const version = request.version();
  const targetPage = page.value;
  moreFailed.value = false;
  loadingMore.value = true;
  try {
    const incoming = (await getRecentCommitsApi(PAGE_SIZE, targetPage)) || [];
    if (!request.current(version)) return;
    appendCommits(incoming);
    if (incoming.length < PAGE_SIZE || page.value * PAGE_SIZE >= 1000) {
      finished.value = true;
    } else {
      page.value += 1;
    }
  } catch (error) {
    if (!request.current(version)) return;
    moreFailed.value = true;
    console.error('加载更多 GitHub 提交失败:', error);
  } finally {
    if (request.current(version)) loadingMore.value = false;
  }
}

function maybeLoadMore() {
  if (
    loading.value ||
    loadingMore.value ||
    finished.value ||
    (failed.value && !loaded.value) ||
    moreFailed.value
  )
    return;
  if (!scrollRoot.value || !sentinel.value) return;
  const distance =
    sentinel.value.getBoundingClientRect().bottom -
    scrollRoot.value.getBoundingClientRect().bottom;
  if (distance <= 160) {
    loadPage();
  }
}

function setupObserver() {
  if (!sentinel.value) return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        maybeLoadMore();
      }
    },
    { root: scrollRoot.value, rootMargin: '120px 0px', threshold: 0 },
  );
  observer.observe(sentinel.value);
}

const request = useHomeRequest({
  initialLoading: true,
  onStart: () => {
    observer?.disconnect();
    loadingMore.value = false;
    moreFailed.value = false;
  },
  fetch: () => getRecentCommitsApi(PAGE_SIZE, 1),
  apply: (incoming) => {
    commits.value = incoming || [];
    finished.value = commits.value.length < PAGE_SIZE;
    page.value = finished.value ? 1 : 2;
  },
  onSettled: () => {
    const version = request.version();
    void nextTick().then(() => {
      if (!request.current(version)) return;
      setupObserver();
      requestAnimationFrame(() => {
        if (request.current(version)) maybeLoadMore();
      });
    });
  },
});
const { loading, loaded, failed } = request;
function load(force = false) {
  return request.load(force);
}

function formatDate(date?: string) {
  if (!date) return '';
  return dayjs(date).format('MM-DD HH:mm');
}

onMounted(() => {
  load();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

defineExpose({ load, loading, loaded, failed });
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col">
    <button
      v-if="failed && !loaded"
      type="button"
      aria-label="最近提交加载失败，重试"
      :disabled="loading"
      class="absolute right-3 top-0 z-10 rounded bg-card/95 p-2 text-xs text-primary"
      @click="load()"
    >
      加载失败，重试
    </button>
    <div v-if="failed && !loaded" class="min-h-16 flex-1"></div>
    <div
      v-else-if="loading && !loaded"
      class="flex-1 space-y-1 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <Skeleton
        v-for="i in 4"
        :key="i"
        :title="{ width: '30%' }"
        :paragraph="{ rows: 1, width: '60%' }"
        active
        class="!w-full"
      />
    </div>
    <div
      v-else-if="loaded && commits.length === 0"
      class="m-2.5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border py-4 text-center sm:m-3"
    >
      <svg
        class="mx-auto mb-1.5 size-7 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
        />
      </svg>
      <p class="text-sm text-muted-foreground">暂无最近提交</p>
      <p class="mt-1 text-xs text-muted-foreground">
        在个人中心绑定 GitHub 账号后即可展示
      </p>
    </div>
    <div
      v-else
      ref="scrollRoot"
      class="flex-1 space-y-1 overflow-y-auto p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <div
        v-for="(item, index) in commits"
        :key="item.id || `${item.repo}-${item.date}-${index}`"
        class="group rounded-xl p-2 transition-all hover:bg-accent hover:text-accent-foreground"
        :style="{ animationDelay: `${index * 40}ms` }"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <div class="flex items-center justify-between gap-2">
            <a
              v-if="item.repoUrl"
              :href="item.repoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="truncate text-xs font-medium text-foreground transition-colors hover:text-primary"
              :title="item.repo"
            >
              {{ item.repo }}
            </a>
            <span v-else class="truncate text-xs font-medium text-foreground">
              {{ item.repo }}
            </span>
            <span class="shrink-0 text-[10px] text-muted-foreground">
              {{ formatDate(item.date) }}
            </span>
          </div>
          <a
            v-if="item.commitUrl"
            :href="item.commitUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="truncate text-xs text-muted-foreground transition-colors hover:text-primary"
            :title="item.message"
          >
            {{ item.message }}
          </a>
          <span
            v-else
            class="truncate text-xs text-muted-foreground"
            :title="item.message"
          >
            {{ item.message }}
          </span>
        </div>
      </div>

      <div
        v-if="!finished"
        ref="sentinel"
        aria-live="polite"
        class="flex items-center justify-center py-2 text-[10px] text-muted-foreground"
        role="status"
      >
        <span
          v-if="loadingMore"
          aria-hidden="true"
          class="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-primary"
        ></span>
        <span v-if="loadingMore" class="sr-only">正在加载更多提交</span>
        <button
          v-else-if="moreFailed"
          type="button"
          aria-label="加载更多提交失败，重试"
          class="rounded p-2 text-primary"
          @click="loadPage"
        >
          重试
        </button>
        <span v-else>向下滚动加载更多</span>
      </div>
      <div
        v-else-if="commits.length > 0"
        class="py-2 text-center text-[10px] text-muted-foreground"
      >
        — 已经到底了 —
      </div>
    </div>
  </div>
</template>
