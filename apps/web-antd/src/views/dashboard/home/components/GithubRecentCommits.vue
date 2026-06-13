<script lang="ts" setup>
import type { GithubCommitVO } from '#/api/core/github';

import { onMounted, ref } from 'vue';

import { Skeleton } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getRecentCommitsApi } from '#/api/core/github';

const commits = ref<GithubCommitVO[]>([]);
const loading = ref(true);
const loaded = ref(false);

async function load() {
  loading.value = true;
  try {
    const list = await getRecentCommitsApi(10);
    commits.value = list || [];
  } catch (error) {
    console.error('获取最近提交失败:', error);
    commits.value = [];
  } finally {
    loading.value = false;
    loaded.value = true;
  }
}

function formatDate(date?: string) {
  if (!date) return '';
  return dayjs(date).format('MM-DD HH:mm');
}

onMounted(() => {
  load();
});

defineExpose({ load });
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div
      v-if="loading"
      class="flex-1 space-y-2 overflow-hidden p-2.5 pt-1.5 sm:p-3 sm:pt-1.5"
    >
      <Skeleton
        v-for="i in 4"
        :key="i"
        :paragraph="{ rows: 1 }"
        active
        class="!w-full"
      />
    </div>
    <div
      v-else-if="loaded && commits.length === 0"
      class="m-2.5 flex-1 rounded-xl border border-dashed border-border py-4 text-center sm:m-3"
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
            class="line-clamp-2 break-all text-xs text-muted-foreground transition-colors hover:text-primary"
            :title="item.message"
          >
            {{ item.message }}
          </a>
          <span
            v-else
            class="line-clamp-2 break-all text-xs text-muted-foreground"
            :title="item.message"
          >
            {{ item.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
