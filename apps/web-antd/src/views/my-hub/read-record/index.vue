<script lang="ts" setup>
import type { ProgressStatus } from '#/api/core/progress-status';
import type { RankingOption } from '#/api/rankings';

import { computed, nextTick, onMounted, reactive, ref, shallowRef } from 'vue';

import { usePreferences } from '@vben/preferences';

import {
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  useElementBounding,
  useElementSize,
  useWindowSize,
} from '@vueuse/core';
import { Button, Empty, Input, Pagination, Select, Spin } from 'ant-design-vue';

import { PROGRESS_STATUS } from '#/api/core/progress-status';
import { fetchRankings } from '#/api/rankings';
import { ReadRecordApi } from '#/api/readRecord';
import { AppModal as Modal } from '#/components/app-modal';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import { loadStatusFilter, saveStatusFilter } from '../status-filter-storage';
import FormDrawerDemo from './form-drawer.vue';
import ShelfGrid from './shelf-grid.vue';

defineOptions({ name: 'ReadRecord' });

type PageResult = Awaited<ReturnType<typeof ReadRecordApi.pageList>>;

const { isMobile } = usePreferences();
const STATUS_FILTER_STORAGE_KEY = 'aio-life:read-record:status-filter';
const WIDE_COLUMNS = 6;
const NARROW_COLUMNS = 3;
const DETAIL_PAGE_SIZE = 12;

const pageRef = ref<HTMLElement>();
const shelfRef = ref<HTMLElement>();
const shelfFrameRef = ref<HTMLElement>();
const backButton = ref<HTMLButtonElement>();
const { top: pageTop } = useElementBounding(pageRef);
const { height: windowHeight, width: windowWidth } = useWindowSize();
const { width: shelfWidth } = useElementSize(shelfFrameRef);
const wideShelf = computed(() => shelfWidth.value >= 552);
const movieColumns = computed(() => {
  const width = windowWidth.value;
  if (width >= 1536) return 9;
  if (width >= 1280) return 7;
  if (width >= 768) return 5;
  if (width >= 640) return 4;
  return NARROW_COLUMNS;
});
const shelfColumns = computed(() => Math.min(movieColumns.value, WIDE_COLUMNS));
const pageStyle = computed(() => ({
  height: `${Math.max(0, windowHeight.value - pageTop.value)}px`,
}));

const modalVisible = ref(false);
const currentRow = ref<ReadRecordApi.ReadRecordVO>();
const rankingOptions = ref<RankingOption[]>([]);
const rankingsLoading = ref(true);
const queryForm = reactive({
  rankingListId: undefined as string | undefined,
  title: '',
  type: undefined as number | undefined,
  statuses: loadStatusFilter(STATUS_FILTER_STORAGE_KEY),
});
const appliedFilters = shallowRef({
  ...queryForm,
  statuses: [...queryForm.statuses],
});

function createPageState() {
  return reactive({
    failed: false,
    loading: false,
    page: 1,
    requestedPage: 1,
    request: 0,
    result: null as null | PageResult,
  });
}

const groups = [
  {
    status: PROGRESS_STATUS.IN_PROGRESS,
    label: '在读',
    preview: createPageState(),
  },
  {
    status: PROGRESS_STATUS.COMPLETED,
    label: '读过',
    preview: createPageState(),
  },
  {
    status: PROGRESS_STATUS.NOT_STARTED,
    label: '想读',
    preview: createPageState(),
  },
  {
    status: PROGRESS_STATUS.ON_HOLD,
    label: '搁置',
    preview: createPageState(),
  },
] as const;
type ShelfGroup = (typeof groups)[number];

const activeGroup = shallowRef<ShelfGroup>();
const detail = createPageState();
let overviewScroll = 0;
let overviewButton: HTMLButtonElement | undefined;

const selectedGroups = computed(() =>
  groups.filter(
    (group) =>
      appliedFilters.value.statuses.length === 0 ||
      appliedFilters.value.statuses.includes(group.status),
  ),
);
const visibleGroups = computed(() =>
  selectedGroups.value.filter(
    ({ preview }) =>
      !preview.result || preview.result.items.length > 0 || preview.failed,
  ),
);
const detailPlaceholderCount = computed(() =>
  Math.min(
    DETAIL_PAGE_SIZE,
    activeGroup.value?.preview.result?.total ?? DETAIL_PAGE_SIZE,
  ),
);

function hasMore(group: ShelfGroup) {
  const result = group.preview.result;
  return (
    result !== null &&
    (result.total ?? result.items.length) > shelfColumns.value
  );
}

async function loadPage(
  state: ReturnType<typeof createPageState>,
  status: ProgressStatus,
  page: number,
  pageSize: number,
) {
  const request = ++state.request;
  state.requestedPage = page;
  state.loading = true;
  const { title, type, rankingListId } = appliedFilters.value;
  const query = { title, type, rankingListId, statuses: [status], pageSize };
  try {
    let result = await ReadRecordApi.pageList({ ...query, page });
    if (state.request !== request) return false;
    const lastPage = Math.max(1, Math.ceil((result.total ?? 0) / pageSize));
    if (result.total !== null && page > lastPage) {
      page = lastPage;
      state.requestedPage = page;
      if (result.total > 0) {
        result = await ReadRecordApi.pageList({ ...query, page });
        if (state.request !== request) return false;
      }
    }
    state.result = result;
    state.page = page;
    state.failed = false;
    return true;
  } catch {
    if (state.request === request) state.failed = true;
    return false;
  } finally {
    if (state.request === request) state.loading = false;
  }
}

function loadPreview(group: ShelfGroup) {
  return loadPage(group.preview, group.status, 1, WIDE_COLUMNS);
}

async function loadDetail(page: number, scrollToTop = false) {
  const group = activeGroup.value;
  if (!group) return;
  const loaded = await loadPage(detail, group.status, page, DETAIL_PAGE_SIZE);
  if (loaded && scrollToTop && shelfRef.value) shelfRef.value.scrollTop = 0;
}

function handleSearch() {
  appliedFilters.value = { ...queryForm, statuses: [...queryForm.statuses] };
  for (const group of selectedGroups.value) void loadPreview(group);
  if (activeGroup.value) void loadDetail(1, true);
  else if (shelfRef.value) shelfRef.value.scrollTop = 0;
}

function handleStatusChange() {
  saveStatusFilter(STATUS_FILTER_STORAGE_KEY, queryForm.statuses);
  handleSearch();
}

async function openGroup(group: ShelfGroup, event: MouseEvent) {
  overviewScroll = shelfRef.value?.scrollTop ?? 0;
  overviewButton = event.currentTarget as HTMLButtonElement;
  detail.result = null;
  detail.page = 1;
  detail.failed = false;
  activeGroup.value = group;
  void loadDetail(1);
  await nextTick();
  if (shelfRef.value) shelfRef.value.scrollTop = 0;
  backButton.value?.focus({ preventScroll: true });
}

async function backToOverview() {
  detail.request += 1;
  activeGroup.value = undefined;
  await nextTick();
  if (shelfRef.value) shelfRef.value.scrollTop = overviewScroll;
  overviewButton?.focus({ preventScroll: true });
}

function openFormModal(row?: ReadRecordApi.ReadRecordVO) {
  currentRow.value = row;
  modalVisible.value = true;
}

function closeFormModal() {
  modalVisible.value = false;
  currentRow.value = undefined;
}

function tableReload(status?: ProgressStatus) {
  const previous = currentRow.value?.status;
  for (const group of groups) {
    if (
      status !== undefined &&
      group.status !== status &&
      group.status !== previous
    ) {
      continue;
    }
    if (selectedGroups.value.includes(group)) void loadPreview(group);
    if (group === activeGroup.value) void loadDetail(detail.requestedPage);
  }
}

onMounted(async () => {
  handleSearch();
  try {
    rankingOptions.value = await fetchRankings('book');
  } catch {
    // 请求客户端已提示。
  } finally {
    rankingsLoading.value = false;
  }
});
</script>

<template>
  <div
    ref="pageRef"
    class="shelf-page flex min-h-0 flex-col pt-4 [--shelf-page-gutter:1rem] md:pt-8 md:[--shelf-page-gutter:2rem]"
    :style="pageStyle"
  >
    <div
      class="shelf-filters shelf-frame mb-5 flex shrink-0 flex-wrap items-center gap-3"
    >
      <Input
        v-model:value="queryForm.title"
        placeholder="搜索标题或作者"
        aria-label="搜索标题或作者"
        allow-clear
        class="min-w-40 flex-1 sm:max-w-96"
        @press-enter="handleSearch"
      >
        <template #prefix>
          <SearchOutlined class="text-muted-foreground" />
        </template>
      </Input>
      <Select
        v-model:value="queryForm.type"
        placeholder="类型"
        aria-label="阅读类型"
        allow-clear
        class="w-28"
        @change="handleSearch"
      >
        <Select.Option :value="1">书籍</Select.Option>
        <Select.Option :value="2">文章/网页</Select.Option>
      </Select>
      <Select
        v-if="!activeGroup"
        v-model:value="queryForm.statuses"
        placeholder="状态"
        aria-label="阅读状态"
        allow-clear
        class="min-w-32 max-w-full shrink-0"
        mode="multiple"
        @change="handleStatusChange"
      >
        <Select.Option
          v-for="group in groups"
          :key="group.status"
          :value="group.status"
        >
          {{ group.label }}
        </Select.Option>
      </Select>
      <Select
        v-model:value="queryForm.rankingListId"
        placeholder="榜单"
        aria-label="榜单"
        allow-clear
        class="w-36"
        :loading="rankingsLoading"
        @change="handleSearch"
      >
        <Select.Option
          v-for="list in rankingOptions"
          :key="list.id"
          :value="list.id"
        >
          {{ list.name }}
        </Select.Option>
      </Select>
      <Button type="primary" @click="handleSearch">搜索</Button>
    </div>

    <div
      ref="shelfRef"
      class="shelf-scroll min-h-0 flex-1 overflow-y-auto"
      :style="{
        '--shelf-columns': shelfColumns,
        '--movie-columns': movieColumns,
      }"
    >
      <div ref="shelfFrameRef" class="shelf-frame shelf-measure">
        <div v-show="!activeGroup" class="shelf-content">
          <Spin
            v-if="visibleGroups.length === 0"
            :spinning="selectedGroups.some(({ preview }) => preview.loading)"
            size="small"
          >
            <Empty class="py-16" description="没有符合条件的阅读记录" />
          </Spin>
          <div v-else class="flex flex-col gap-3">
            <section
              v-for="group in visibleGroups"
              :key="group.status"
              :aria-labelledby="`read-shelf-${group.status}`"
              class="min-w-0"
            >
              <div class="mb-2 flex min-h-8 items-center justify-between gap-2">
                <h2
                  :id="`read-shelf-${group.status}`"
                  class="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-sm font-semibold"
                >
                  {{ group.label }}
                  <span
                    v-if="group.preview.result?.total != null"
                    class="text-xs font-normal text-muted-foreground"
                  >
                    {{ group.preview.result.total }}本
                  </span>
                </h2>
                <Button
                  v-if="group.preview.failed"
                  type="link"
                  size="small"
                  :loading="group.preview.loading"
                  @click="loadPreview(group)"
                >
                  重试
                </Button>
                <button
                  v-else-if="hasMore(group)"
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline"
                  :aria-label="`查看全部${group.label}记录`"
                  @click="openGroup(group, $event)"
                >
                  查看全部
                  <RightOutlined aria-hidden="true" />
                </button>
              </div>
              <Spin
                :spinning="
                  group.preview.loading && group.preview.result !== null
                "
                size="small"
              >
                <ShelfGrid
                  :columns="shelfColumns"
                  :records="
                    group.preview.result?.items.slice(0, shelfColumns) ?? []
                  "
                  :placeholder-count="group.preview.result ? 0 : shelfColumns"
                  :loading="group.preview.loading"
                  @edit="openFormModal"
                />
              </Spin>
            </section>
          </div>
        </div>

        <section
          v-if="activeGroup"
          aria-labelledby="read-shelf-detail"
          class="shelf-content"
        >
          <button
            ref="backButton"
            type="button"
            class="mb-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            @click="backToOverview"
          >
            <LeftOutlined aria-hidden="true" />
            书架
          </button>
          <div class="mb-3 flex min-h-8 items-center justify-between gap-2">
            <h2
              id="read-shelf-detail"
              class="flex items-center gap-2 text-lg font-semibold"
            >
              {{ activeGroup.label }}
              <span
                v-if="detail.result?.total != null"
                class="text-xs font-normal text-muted-foreground"
              >
                {{ detail.result.total }}本
              </span>
            </h2>
            <Button
              v-if="detail.failed"
              type="link"
              size="small"
              :loading="detail.loading"
              @click="loadDetail(detail.requestedPage, true)"
            >
              重试
            </Button>
          </div>
          <Spin
            :spinning="detail.loading && detail.result !== null"
            size="small"
          >
            <Empty
              v-if="detail.result?.items.length === 0"
              description="没有符合条件的阅读记录"
            />
            <ShelfGrid
              v-else
              :columns="shelfColumns"
              :records="detail.result?.items ?? []"
              :placeholder-count="detail.result ? 0 : detailPlaceholderCount"
              :loading="detail.loading"
              @edit="openFormModal"
            />
          </Spin>
          <Pagination
            v-if="
              detail.result?.total != null &&
              detail.result.total > DETAIL_PAGE_SIZE
            "
            class="mt-5 flex justify-center"
            aria-label="阅读记录分页"
            :current="detail.page"
            :total="detail.result.total"
            :page-size="DETAIL_PAGE_SIZE"
            :show-size-changer="false"
            :simple="!wideShelf"
            :disabled="detail.loading"
            show-less-items
            @change="loadDetail($event, true)"
          />
        </section>
      </div>
    </div>

    <GlobalFloatBtn @click="openFormModal()" />
    <Modal
      v-model:open="modalVisible"
      :width="isMobile ? 'calc(100vw - 32px)' : 560"
      :footer="null"
      :closable="false"
      :destroy-on-close="true"
      centered
    >
      <FormDrawerDemo
        :values="currentRow"
        @table-reload="tableReload"
        @close="closeFormModal"
      />
    </Modal>
  </div>
</template>

<style scoped>
.shelf-filters {
  --shelf-filter-border: rgb(0 0 0 / 30%);
}

.dark .shelf-filters {
  --shelf-filter-border: rgb(255 255 255 / 36%);
}

.shelf-filters :deep(.ant-input-affix-wrapper),
.shelf-filters :deep(.ant-input-affix-wrapper > .ant-input),
.shelf-filters :deep(.ant-select .ant-select-selector),
.shelf-filters :deep(.ant-select .ant-select-clear) {
  background-color: hsl(var(--background-deep));
}

.shelf-filters :deep(.ant-input-affix-wrapper:not(:hover, :focus-within)),
.shelf-filters
  :deep(.ant-select:not(:hover, .ant-select-focused) .ant-select-selector) {
  border-color: var(--shelf-filter-border);
}

.shelf-frame {
  --shelf-frame-width: min(80rem, calc(100cqi - 2 * var(--shelf-page-gutter)));
  --shelf-frame-inset: calc((100cqi - var(--shelf-frame-width)) / 2);

  inline-size: var(--shelf-frame-width);
  max-inline-size: calc(100% - var(--shelf-frame-inset));
  margin-inline-start: var(--shelf-frame-inset);
}

.shelf-page,
.shelf-measure {
  container-type: inline-size;
}

.shelf-content {
  --shelf-column-gap: 0.75rem;
  --movie-column-gap: 1rem;
  --shelf-cover-width: calc(
    (100cqi + var(--movie-column-gap)) / var(--movie-columns) -
      var(--movie-column-gap)
  );

  max-inline-size: calc(
    var(--shelf-columns) *
      (var(--shelf-cover-width) + var(--shelf-column-gap)) -
      var(--shelf-column-gap)
  );
}
</style>
