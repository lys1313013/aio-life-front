<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Empty,
  Input,
  message,
  Modal,
  Spin,
  Switch,
  Tag,
  theme,
} from 'ant-design-vue';

import { MovieApi } from '#/api/movie';
import { ReadRecordApi } from '#/api/readRecord';
import AuthImage from '#/components/AuthImage.vue';

const props = defineProps<{
  relateId?: string;
  relateType?: number; // 1-阅读，2-观影
}>();

const emit = defineEmits<{
  (e: 'update:relateId', val?: string): void;
  (e: 'update:relateType', val?: number): void;
  (e: 'change', item?: any): void;
}>();

const visible = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const recordList = ref<any[]>([]);
const selectedItem = ref<any>(null);
const searchKeyword = ref('');
const showAll = ref(false);
const currentPage = ref(1);
const hasMore = ref(true);
const recordGridRef = ref<HTMLElement>();

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;
let requestSerial = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const { token } = theme.useToken();

const isMobile = computed(() => window.innerWidth < 1024);

const searchPlaceholder = computed(() =>
  props.relateType === 2 ? '搜索影视名称或导演' : '搜索书名或作者',
);

const emptyDescription = computed(() => {
  if (searchKeyword.value.trim()) return '没有找到匹配的记录';
  return showAll.value ? '暂无可选记录' : '暂无未开始或进行中的记录';
});

const syncSelectedItem = async () => {
  if (!props.relateId || !props.relateType) return;

  const targetId = String(props.relateId);
  const loadedItem = recordList.value.find(
    (item) => String(item.id) === targetId,
  );
  if (loadedItem) {
    selectedItem.value = loadedItem;
    return;
  }
  if (String(selectedItem.value?.id) === targetId) return;

  try {
    const item =
      props.relateType === 1
        ? await ReadRecordApi.getById(props.relateId)
        : await MovieApi.getById(props.relateId);
    if (String(props.relateId) === targetId) {
      selectedItem.value = item;
    }
  } catch {
    // 详情回显失败不影响候选记录加载
  }
};

const loadData = async (loadMore = false) => {
  if (!props.relateType) return;
  if (loadMore && (loading.value || loadingMore.value || !hasMore.value)) {
    return;
  }

  const targetPage = loadMore ? currentPage.value + 1 : 1;
  const currentRequest = loadMore ? requestSerial : ++requestSerial;
  if (loadMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
    loadingMore.value = false;
    hasMore.value = true;
  }

  try {
    const query = {
      activeOnly: !showAll.value,
      current: targetPage,
      size: PAGE_SIZE,
      title: searchKeyword.value.trim() || undefined,
    };
    const response =
      props.relateType === 1
        ? await ReadRecordApi.pageList(query)
        : await MovieApi.pageList(query);

    if (currentRequest !== requestSerial) return;

    const records = response.records || [];
    if (loadMore) {
      const loadedIds = new Set(
        recordList.value.map((item) => String(item.id)),
      );
      recordList.value.push(
        ...records.filter((item) => !loadedIds.has(String(item.id))),
      );
    } else {
      recordList.value = records;
      await nextTick();
      recordGridRef.value?.scrollTo({ top: 0 });
    }
    currentPage.value = targetPage;
    hasMore.value = recordList.value.length < Number(response.total || 0);

    if (!loadMore) await syncSelectedItem();
  } catch (error) {
    if (currentRequest === requestSerial) {
      console.error('获取关联数据失败', error);
      message.error('加载关联记录失败，请稍后重试');
    }
  } finally {
    if (currentRequest === requestSerial) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
};

const openModal = () => {
  visible.value = true;
  loadData();
};

const handleScopeChange = () => {
  if (searchTimer) clearTimeout(searchTimer);
  loadData();
};

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
    loadData(true);
  }
};

const handleSelect = (item: any) => {
  selectedItem.value = item;
  visible.value = false;
  emit('update:relateId', item.id);
  emit('change', item);
};

const handleClear = () => {
  selectedItem.value = null;
  emit('update:relateId', undefined);
  emit('change', null);
};

const getStatusText = (status: number) => {
  if (status === 0) return props.relateType === 2 ? '想看' : '未开始';
  if (status === 1) return props.relateType === 2 ? '在看' : '阅读中';
  if (status === 2) return props.relateType === 2 ? '看过' : '已完成';
  if (status === 3) return '搁置';
  return '未知';
};

const getStatusColor = (status: number) => {
  if (status === 0) return 'default';
  if (status === 1) return 'processing';
  if (status === 2) return 'success';
  if (status === 3) return 'warning';
  return 'default';
};

// 监听 props.relateType 的变化，如果类型变了，清空当前选择
watch(
  () => props.relateType,
  (newVal, oldVal) => {
    if (newVal !== oldVal) {
      showAll.value = false;
      searchKeyword.value = '';
      if (oldVal !== undefined) {
        handleClear();
      }
      if (newVal && props.relateId) {
        syncSelectedItem();
      }
    }
  },
  { immediate: true },
);

watch(
  () => props.relateId,
  (newVal) => {
    if (newVal && !selectedItem.value && props.relateType) {
      syncSelectedItem();
    } else if (!newVal) {
      selectedItem.value = null;
    }
  },
);

watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer);
  if (!visible.value) return;

  searchTimer = setTimeout(() => {
    if (visible.value) loadData();
  }, SEARCH_DEBOUNCE_MS);
});

watch(visible, (isVisible) => {
  if (!isVisible && searchTimer) clearTimeout(searchTimer);
});

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="relate-record-selector">
    <div
      v-if="selectedItem"
      class="selected-card"
      role="button"
      tabindex="0"
      @click="openModal"
      @keydown.enter="openModal"
      @keydown.space.prevent="openModal"
      style="cursor: pointer"
    >
      <div class="card-content">
        <AuthImage
          v-if="selectedItem.fileId"
          :file-id="selectedItem.fileId"
          :width="60"
          :height="80"
          style="object-fit: cover; border-radius: 4px"
        />
        <span
          v-else-if="selectedItem.coverImgUrl"
          class="cover-img-cell"
          style="width: 60px; height: 80px; border-radius: 4px"
        >
          <span class="cover-img-placeholder"></span>
          <img
            :src="selectedItem.coverImgUrl"
            :width="60"
            :height="80"
            class="cover-img-fade"
            referrerpolicy="no-referrer"
            @load="
              (e) => (e.target as HTMLImageElement).classList.add('loaded')
            "
          />
        </span>
        <div class="info">
          <div class="title">{{ selectedItem.title }}</div>
          <div class="progress">
            <Tag :color="getStatusColor(selectedItem.status)">
              {{ getStatusText(selectedItem.status) }}
            </Tag>
          </div>
        </div>
        <div class="actions" @click.stop>
          <Button
            type="link"
            danger
            aria-label="清除关联记录"
            @click="handleClear"
          >
            <template #icon><CloseOutlined /></template>
          </Button>
        </div>
      </div>
    </div>
    <div v-else-if="loading" class="selected-card selected-card-skeleton">
      <div class="card-content">
        <span
          class="cover-img-cell"
          style="width: 60px; height: 80px; border-radius: 4px"
        >
          <span class="cover-img-placeholder"></span>
        </span>
        <div class="info">
          <div class="skeleton-line skeleton-line-short"></div>
          <div class="skeleton-line skeleton-line-tag"></div>
        </div>
      </div>
    </div>
    <div v-else class="empty-select">
      <Button type="dashed" block @click="openModal" style="height: 60px">
        <span class="icon-plus">+</span>
      </Button>
    </div>

    <Modal
      v-model:open="visible"
      :closable="false"
      :width="isMobile ? '95vw' : 600"
      :footer="null"
      :centered="true"
      destroy-on-close
    >
      <Spin :spinning="loading">
        <div class="record-toolbar">
          <Input
            v-model:value="searchKeyword"
            allow-clear
            :placeholder="searchPlaceholder"
            class="record-search"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <label class="scope-switch">
            <span>显示全部</span>
            <Switch
              v-model:checked="showAll"
              :loading="loading"
              size="small"
              @change="handleScopeChange"
            />
          </label>
        </div>
        <div
          v-if="recordList.length > 0"
          ref="recordGridRef"
          class="record-grid"
          @scroll="handleScroll"
        >
          <div
            v-for="item in recordList"
            :key="item.id"
            class="record-card"
            :aria-label="`${item.title}，${getStatusText(item.status)}`"
            :aria-pressed="String(relateId) === String(item.id)"
            role="button"
            tabindex="0"
            @click="handleSelect(item)"
            @keydown.enter="handleSelect(item)"
            @keydown.space.prevent="handleSelect(item)"
          >
            <div class="card-inner aspect-[3/4]">
              <AuthImage
                v-if="item.fileId"
                :file-id="item.fileId"
                style="
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  display: block;
                  border-radius: 4px;
                "
              />
              <span
                v-else-if="item.coverImgUrl"
                class="cover-img-cell"
                style="width: 100%; height: 100%; border-radius: 4px"
              >
                <span class="cover-img-placeholder"></span>
                <img
                  :src="item.coverImgUrl"
                  class="cover-img-fade"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    border-radius: 4px;
                  "
                  referrerpolicy="no-referrer"
                  @load="
                    (e) =>
                      (e.target as HTMLImageElement).classList.add('loaded')
                  "
                />
              </span>
            </div>
            <div class="record-status">
              <Tag :color="getStatusColor(item.status)">
                {{ getStatusText(item.status) }}
              </Tag>
            </div>
          </div>
          <div v-if="loadingMore" class="load-more-status">
            <Spin size="small" />
            <span>加载更多...</span>
          </div>
          <div
            v-else-if="!hasMore"
            aria-label="已加载全部"
            class="load-end-divider"
            role="separator"
          ></div>
        </div>
        <Empty v-else :description="emptyDescription" />
      </Spin>
    </Modal>
  </div>
</template>

<style scoped>
.relate-record-selector {
  width: 100%;
}

.selected-card {
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 6px;
  padding: 8px;
  background-color: v-bind('token.colorFillQuaternary');
  transition: all 0.3s;
}

.selected-card:hover {
  border-color: v-bind('token.colorPrimary');
  background-color: v-bind('token.colorPrimaryBg');
}

.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
}

.actions {
  display: flex;
  flex-direction: column;
}

.actions .ant-btn {
  padding: 0;
  height: auto;
  line-height: 1.5;
}

.empty-select .icon-plus {
  margin-right: 4px;
  font-size: 16px;
}

.record-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.record-search {
  flex: 1;
  min-width: 0;
}

.scope-switch {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  color: v-bind('token.colorText');
  cursor: pointer;
  font-size: 12px;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}

@media (max-width: 768px) {
  .record-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.record-card {
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
  padding: 0;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.record-card:hover {
  opacity: 0.88;
  transform: translateY(-2px);
}

.record-card:focus-visible {
  outline: 2px solid v-bind('token.colorPrimary');
  outline-offset: 2px;
}

.load-more-status {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 32px;
  color: v-bind('token.colorTextSecondary');
  font-size: 12px;
}

.load-end-divider {
  grid-column: 1 / -1;
  width: 40px;
  height: 1px;
  margin: 15px auto 16px;
  background: v-bind('token.colorBorderSecondary');
}

.card-inner {
  position: relative;
  display: block;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}

.record-status {
  display: flex;
  justify-content: flex-end;
  padding-top: 6px;
}

.record-status .ant-tag {
  margin-inline-end: 0;
}

.cover-img-cell {
  position: relative;
  display: block;
  flex-shrink: 0;
  overflow: hidden;
}

.cover-img-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--color-fill-tertiary, #f5f5f5);
  animation: cover-pulse 1.5s ease-in-out infinite;
}

.cover-img-fade {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-img-fade.loaded {
  opacity: 1;
}

.selected-card-skeleton {
  cursor: default;
}

.skeleton-line {
  height: 14px;
  border-radius: 4px;
  background: v-bind('token.colorFillSecondary');
  animation: cover-pulse 1.5s ease-in-out infinite;
}

.skeleton-line-short {
  width: 60%;
  margin-bottom: 8px;
}

.skeleton-line-tag {
  width: 40%;
  height: 20px;
}

@keyframes cover-pulse {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .record-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .scope-switch {
    justify-content: flex-end;
  }
}
</style>
