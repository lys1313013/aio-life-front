<script setup lang="ts">
import type { StorageObject, StoragePage } from '#/api/system/storage';

import { computed, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Empty,
  InputSearch,
  Modal,
  Popconfirm,
  Spin,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteStorageObject,
  queryStorageObjects,
  readStorageObject,
} from '#/api/system/storage';

import StorageThumbnail from './StorageThumbnail.vue';

defineOptions({ name: 'StorageAdmin' });

const userStore = useUserStore();
const isAdmin = computed(() => userStore.userInfo?.roles?.includes('admin'));
const data = ref<StoragePage>();
const inputPrefix = ref('');
const cursors = ref<string[]>(['']);
const loading = ref(false);
const failed = ref(false);
const downloading = ref(new Set<string>());
const downloadFailed = ref(false);
const deleting = ref(new Set<string>());
const deletionVersions = new Map<string, number>();
let deletionVersion = 0;
const preview = ref<{ key: string; url: string }>();
let generation = 0;
let disposed = false;
const downloadUrls = new Set<string>();

const breadcrumbs = computed(() => {
  const prefix = data.value?.prefix || '';
  return [...prefix.matchAll(/\//g)].map((match) => ({
    label:
      prefix
        .slice(0, match.index + 1)
        .split('/')
        .at(-2) || '/',
    prefix: prefix.slice(0, match.index + 1),
  }));
});

async function load(
  prefix = data.value?.prefix || '',
  history = cursors.value,
) {
  if (!isAdmin.value) return;
  const request = ++generation;
  const deletionVersionAtStart = deletionVersion;
  loading.value = true;
  failed.value = false;
  try {
    const result = await queryStorageObjects({
      prefix,
      cursor: history.at(-1) || undefined,
      pageSize: 24,
    });
    if (disposed || request !== generation) return;
    result.items = result.items.filter(
      (item) => (deletionVersions.get(item.key) || 0) <= deletionVersionAtStart,
    );
    preview.value = undefined;
    data.value = result;
    inputPrefix.value = prefix;
    cursors.value = [...history];
  } catch {
    if (request === generation) failed.value = true;
  } finally {
    if (request === generation) loading.value = false;
  }
}

function navigate(prefix: string) {
  void load(prefix, ['']);
}

function name(item: StorageObject) {
  const prefix = data.value?.prefix || '';
  return item.key.slice(prefix.lastIndexOf('/') + 1) || item.key;
}

function size(value: number | string) {
  const bytes = Number(value);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function remove(item: StorageObject) {
  if (!isAdmin.value || item.directory || deleting.value.has(item.key)) return;
  deleting.value.add(item.key);
  try {
    await deleteStorageObject(item.key);
    if (disposed) return;
    deletionVersions.set(item.key, ++deletionVersion);
    if (preview.value?.key === item.key) preview.value = undefined;
    if (data.value)
      data.value.items = data.value.items.filter(
        (entry) => entry.key !== item.key,
      );
  } catch {
    // 全局请求拦截器显示后端关联记录或删除失败原因；保留原卡片以便重试。
  } finally {
    deleting.value.delete(item.key);
  }
}

async function download(item: StorageObject) {
  downloading.value.add(item.key);
  downloadFailed.value = false;
  try {
    const blob = await readStorageObject(item.key, true);
    if (disposed) return;
    const url = URL.createObjectURL(blob);
    downloadUrls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.key.split('/').at(-1) || 'file';
    anchor.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      downloadUrls.delete(url);
    }, 60_000);
  } catch {
    downloadFailed.value = true;
  } finally {
    downloading.value.delete(item.key);
  }
}

onMounted(() => void load());
onDeactivated(() => {
  preview.value = undefined;
});
onBeforeUnmount(() => {
  disposed = true;
  generation++;
  downloadUrls.forEach((url) => URL.revokeObjectURL(url));
});
</script>

<template>
  <div class="p-4 md:p-5">
    <Alert v-if="!isAdmin" type="error" message="仅管理员可使用对象存储管理" />
    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="flex w-full items-center gap-3 sm:w-auto">
          <h1 class="shrink-0 text-lg font-semibold">对象存储</h1>
          <span class="min-w-0 break-all text-sm text-muted-foreground">{{
            data?.bucket
          }}</span>
        </div>
        <InputSearch
          v-model:value="inputPrefix"
          class="min-w-0 flex-1 basis-56 md:max-w-md"
          placeholder="路径前缀"
          aria-label="路径前缀"
          :loading="loading"
          allow-clear
          @search="navigate(inputPrefix)"
        />
        <Button aria-label="刷新" :loading="loading" @click="load()">
          <VbenIcon icon="lucide:refresh-cw" />
        </Button>
      </div>
      <nav
        aria-label="存储路径"
        class="mb-4 flex flex-wrap items-center gap-1 text-sm"
      >
        <Button type="link" :disabled="loading" @click="navigate('')">
          根目录
        </Button>
        <template v-for="crumb in breadcrumbs" :key="crumb.prefix">
          <span class="text-muted-foreground">/</span>
          <Button
            type="link"
            :disabled="loading"
            @click="navigate(crumb.prefix)"
          >
            {{ crumb.label }}
          </Button>
        </template>
      </nav>
      <Alert
        v-if="failed"
        class="mb-4"
        type="error"
        message="读取失败，请重试；已加载的内容仍保留。"
      />
      <Alert
        v-if="downloadFailed"
        class="mb-4"
        type="error"
        message="下载失败，请重试。"
        closable
      />
      <Spin :spinning="loading">
        <div
          v-if="data?.items.length"
          class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6"
        >
          <article
            v-for="item in data.items"
            :key="item.key"
            class="min-w-0 overflow-hidden rounded-lg bg-card"
          >
            <div class="h-36 bg-secondary/40 md:h-40">
              <button
                v-if="item.directory"
                type="button"
                class="flex h-full w-full items-center justify-center"
                :aria-label="`打开目录 ${item.key}`"
                :disabled="loading"
                @click="navigate(item.key)"
              >
                <VbenIcon icon="lucide:folder" class="size-12 text-primary" />
              </button>
              <StorageThumbnail
                v-else-if="item.previewable"
                :key="`${item.key}:${item.lastModified}:${item.size}`"
                :object-key="item.key"
                @preview="(url) => (preview = { key: item.key, url })"
              />
              <div
                v-else
                class="flex h-full items-center justify-center text-muted-foreground"
              >
                <VbenIcon icon="lucide:file" class="size-10" />
              </div>
            </div>
            <div class="p-3">
              <button
                v-if="item.directory"
                type="button"
                class="w-full break-all text-left text-sm"
                :disabled="loading"
                @click="navigate(item.key)"
              >
                {{ name(item) }}
              </button>
              <template v-else>
                <div class="break-all text-sm">{{ name(item) }}</div>
                <div class="mt-1 flex items-center justify-between gap-1">
                  <span class="text-xs text-muted-foreground">{{
                    size(item.size)
                  }}</span>
                  <div class="flex shrink-0 items-center">
                    <Button
                      type="text"
                      :aria-label="`下载 ${item.key}`"
                      :loading="downloading.has(item.key)"
                      @click="download(item)"
                    >
                      <VbenIcon icon="lucide:download" />
                    </Button>
                    <Popconfirm
                      :title="`确认永久删除「${name(item)}」？`"
                      :overlay-style="{
                        maxWidth: 'min(360px, calc(100vw - 32px))',
                        overflowWrap: 'anywhere',
                      }"
                      ok-text="删除"
                      cancel-text="取消"
                      :ok-button-props="{
                        danger: true,
                        loading: deleting.has(item.key),
                      }"
                      @confirm="remove(item)"
                    >
                      <Button
                        type="text"
                        danger
                        :aria-label="`删除 ${item.key}`"
                        :loading="deleting.has(item.key)"
                      >
                        <VbenIcon icon="lucide:trash-2" />
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
                <div
                  v-if="item.lastModified"
                  class="text-xs text-muted-foreground"
                >
                  {{ dayjs(item.lastModified).format('YYYY-MM-DD HH:mm') }}
                </div>
              </template>
            </div>
          </article>
        </div>
        <Empty v-else-if="!loading && !failed" description="此路径下暂无文件" />
        <div v-else class="h-36"></div>
      </Spin>
      <div v-if="data" class="mt-4 flex items-center justify-end gap-3">
        <Button
          aria-label="上一页"
          :disabled="loading || cursors.length <= 1"
          @click="load(data.prefix, cursors.slice(0, -1))"
        >
          <VbenIcon icon="lucide:chevron-left" />
        </Button>
        <span class="text-sm text-muted-foreground">{{ cursors.length }}</span>
        <Button
          aria-label="下一页"
          :disabled="loading || !data.nextCursor"
          @click="load(data.prefix, [...cursors, data.nextCursor!])"
        >
          <VbenIcon icon="lucide:chevron-right" />
        </Button>
      </div>
      <Modal
        :open="!!preview"
        :title="preview?.key"
        :footer="null"
        centered
        width="min(960px, 94vw)"
        destroy-on-close
        @cancel="preview = undefined"
      >
        <img
          v-if="preview"
          :src="preview.url"
          :alt="preview.key"
          class="max-h-[75vh] w-full object-contain"
        />
      </Modal>
    </template>
  </div>
</template>
