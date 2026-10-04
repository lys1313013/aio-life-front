<script setup lang="ts">
import type { GoalEntity, GoalQueryParams } from '#/api/core/goal';
import type { ProgressStatus } from '#/api/core/progress-status';

import { onMounted, ref } from 'vue';

import {
  CalendarOutlined,
  PushpinFilled,
  PushpinOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Empty as AEmpty,
  Input as AInput,
  Progress as AProgress,
  Select as ASelect,
  SelectOption as ASelectOption,
  Tag as ATag,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { appDialog } from '#/adapter/modal-dialog';
import { deleteGoals, getGoalList, setGoalPinned } from '#/api/core/goal';
import { PROGRESS_STATUS } from '#/api/core/progress-status';
import ContentLoading from '#/components/ContentLoading.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import GoalEditor from './GoalEditor.vue';

const editorRef = ref<InstanceType<typeof GoalEditor>>();
const pinLoading = ref(new Set<string>());

// Data
const goals = ref<GoalEntity[]>([]);
const loading = ref(false);

// Filters
const filters = ref<GoalQueryParams>({
  keyword: '',
  type: undefined,
  status: undefined,
});

// Computed properties for UI mapping
const typeMap: Record<number, { color: string; label: string }> = {
  1: { label: '日', color: 'green' },
  2: { label: '周', color: 'cyan' },
  3: { label: '月', color: 'blue' },
  4: { label: '季度', color: 'orange' },
  5: { label: '半年', color: 'gold' },
  6: { label: '年度', color: 'red' },
  7: { label: '三年', color: 'purple' },
  8: { label: '五年', color: 'magenta' },
  9: { label: '十年', color: 'volcano' },
  10: { label: '终生', color: 'geekblue' },
};

const statusMap: Record<ProgressStatus, { color: string; label: string }> = {
  [PROGRESS_STATUS.NOT_STARTED]: { label: '待开始', color: 'default' },
  [PROGRESS_STATUS.IN_PROGRESS]: { label: '进行中', color: 'processing' },
  [PROGRESS_STATUS.COMPLETED]: { label: '已完成', color: 'success' },
  [PROGRESS_STATUS.ON_HOLD]: { label: '搁置', color: 'warning' },
};

// Load Data
const loadData = async () => {
  try {
    loading.value = true;
    const res = await getGoalList({
      ...filters.value,
    });
    goals.value = res;
  } catch (error) {
    console.error('Failed to load goals:', error);
    // 全局拦截器已提示
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

// Actions
const handleSearch = () => {
  loadData();
};

const clearFilters = () => {
  filters.value = {
    keyword: '',
    type: undefined,
    status: undefined,
  };
  loadData();
};

const handleAdd = () => editorRef.value?.open();
const handleEdit = (item: GoalEntity) => editorRef.value?.open(item);
const handleSaved = (record: GoalEntity) => {
  const index = goals.value.findIndex((item) => item.id === record.id);
  const { keyword, status, type } = filters.value;
  const matches =
    (!status || record.status === status) &&
    (!type || record.type === type) &&
    (!keyword ||
      [record.title, record.description, record.tags].some((value) =>
        value?.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()),
      ));
  if (!matches) {
    if (index !== -1) goals.value.splice(index, 1);
    return;
  }
  if (index === -1) {
    goals.value.unshift(record);
  } else {
    goals.value.splice(index, 1, record);
  }
};
const handleDeleted = (id: string) => {
  goals.value = goals.value.filter((item) => item.id !== id);
};
const handleDelete = (id: string) => {
  appDialog.confirm({
    title: '确定要删除这个目标吗？',
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    onOk: async () => {
      await deleteGoals([id]);
      handleDeleted(id);
      message.success('删除成功');
    },
  });
};
const handlePin = async (item: GoalEntity) => {
  if (!item.id || pinLoading.value.has(item.id)) return;
  pinLoading.value.add(item.id);
  try {
    handleSaved(await setGoalPinned(item.id, item.isPinned === 1 ? 0 : 1));
  } catch {
    // 请求客户端统一提示错误，保留原固定状态。
  } finally {
    pinLoading.value.delete(item.id);
  }
};

const calculateProgress = (item: GoalEntity) => {
  if (item.targetValue && item.targetValue > 0) {
    return Math.min(
      100,
      Math.round(((item.currentValue || 0) / item.targetValue) * 100),
    );
  }
  return item.status === PROGRESS_STATUS.COMPLETED ? 100 : 0;
};

// Helper methods for UI
const parseTags = (tagsStr?: string): string[] => {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [tagsStr];
  } catch {
    return [tagsStr];
  }
};

const getStatusBadgeColor = (status: ProgressStatus) => {
  switch (status) {
    case PROGRESS_STATUS.COMPLETED: {
      return 'bg-green-500';
    }
    case PROGRESS_STATUS.IN_PROGRESS: {
      return 'bg-blue-500';
    }
    case PROGRESS_STATUS.NOT_STARTED: {
      return 'bg-gray-400';
    }
    case PROGRESS_STATUS.ON_HOLD: {
      return 'bg-orange-500';
    }
    default: {
      return 'bg-gray-400';
    }
  }
};
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
      <AInput
        v-model:value="filters.keyword"
        placeholder="搜索标题、描述、标签..."
        class="min-w-48 flex-1 sm:max-w-96"
        allow-clear
        @press-enter="handleSearch"
      >
        <template #prefix><SearchOutlined class="text-gray-400" /></template>
      </AInput>

      <ASelect
        v-model:value="filters.type"
        placeholder="类型"
        class="w-28"
        allow-clear
        @change="handleSearch"
      >
        <ASelectOption :value="1">日</ASelectOption>
        <ASelectOption :value="2">周</ASelectOption>
        <ASelectOption :value="3">月</ASelectOption>
        <ASelectOption :value="4">季度</ASelectOption>
        <ASelectOption :value="5">半年</ASelectOption>
        <ASelectOption :value="6">年度</ASelectOption>
        <ASelectOption :value="7">三年</ASelectOption>
        <ASelectOption :value="8">五年</ASelectOption>
        <ASelectOption :value="9">十年</ASelectOption>
        <ASelectOption :value="10">终生</ASelectOption>
      </ASelect>

      <ASelect
        v-model:value="filters.status"
        placeholder="状态"
        class="w-28"
        allow-clear
        @change="handleSearch"
      >
        <ASelectOption :value="PROGRESS_STATUS.NOT_STARTED">
          待开始
        </ASelectOption>
        <ASelectOption :value="PROGRESS_STATUS.IN_PROGRESS">
          进行中
        </ASelectOption>
        <ASelectOption :value="PROGRESS_STATUS.COMPLETED">
          已完成
        </ASelectOption>
        <ASelectOption :value="PROGRESS_STATUS.ON_HOLD">搁置</ASelectOption>
      </ASelect>

      <div class="flex items-center gap-2">
        <AButton type="primary" @click="handleSearch">搜索</AButton>
        <AButton type="text" @click="clearFilters">重置</AButton>
      </div>
    </div>

    <!-- Card Grid -->
    <ContentLoading v-if="loading" min-height="calc(100vh - 200px)" />
    <template v-else>
      <div
        v-if="goals.length === 0 && !loading"
        class="py-20 text-center text-gray-400"
      >
        <AEmpty description="暂无目标记录" />
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="item in goals"
          :key="item.id"
          class="apple-card group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-6"
          @click="handleEdit(item)"
          @contextmenu.prevent="handleDelete(item.id!)"
        >
          <!-- Card Header -->
          <div>
            <div class="mb-3 flex items-start justify-between">
              <ATag
                :color="typeMap[item.type]?.color || 'default'"
                class="m-0 border-0 font-medium"
              >
                {{ typeMap[item.type]?.label }}
              </ATag>
              <div class="flex items-center gap-1.5">
                <AButton
                  type="text"
                  class="!h-11 !w-11"
                  :loading="pinLoading.has(item.id!)"
                  :aria-label="
                    item.isPinned === 1 ? '取消固定到首页' : '固定到首页'
                  "
                  :aria-pressed="item.isPinned === 1"
                  @click.stop="handlePin(item)"
                >
                  <template #icon>
                    <PushpinFilled v-if="item.isPinned === 1" /><PushpinOutlined
                      v-else
                    />
                  </template>
                </AButton>
                <div
                  class="h-2 w-2 rounded-full"
                  :class="getStatusBadgeColor(item.status)"
                ></div>
                <span class="text-xs text-muted-foreground">{{
                  statusMap[item.status]?.label
                }}</span>
              </div>
            </div>

            <h3
              class="mb-2 line-clamp-2 text-lg font-bold text-card-foreground"
              :title="item.title"
            >
              {{ item.title }}
            </h3>

            <!-- Tags -->
            <div
              class="mb-3 flex flex-wrap gap-1.5"
              v-if="item.tags && parseTags(item.tags).length > 0"
            >
              <span
                v-for="tag in parseTags(item.tags)"
                :key="tag"
                class="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {{ tag }}
              </span>
            </div>

            <p
              class="mb-4 line-clamp-3 text-sm text-muted-foreground"
              v-if="item.description"
            >
              {{ item.description }}
            </p>
          </div>

          <!-- Card Footer -->
          <div class="mt-4">
            <div
              class="mb-2 flex items-center justify-between text-xs text-muted-foreground"
            >
              <div class="flex items-center gap-1">
                <CalendarOutlined />
                <span v-if="item.startDate || item.endDate">
                  {{
                    item.startDate
                      ? dayjs(item.startDate).format('MM-DD')
                      : '不限'
                  }}
                  ~
                  {{
                    item.endDate ? dayjs(item.endDate).format('MM-DD') : '不限'
                  }}
                </span>
                <span v-else>无期限</span>
              </div>
              <span
                class="font-medium"
                :class="{
                  'text-success': item.status === PROGRESS_STATUS.COMPLETED,
                }"
              >
                {{ calculateProgress(item) }}%
              </span>
            </div>
            <AProgress
              :percent="calculateProgress(item)"
              :show-info="false"
              size="small"
              :status="
                item.status === PROGRESS_STATUS.COMPLETED
                  ? 'success'
                  : item.status === PROGRESS_STATUS.ON_HOLD
                    ? 'normal'
                    : 'active'
              "
            />
          </div>
        </div>
      </div>
    </template>

    <GoalEditor ref="editorRef" @saved="handleSaved" @deleted="handleDeleted" />

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.apple-card {
  border: 1px solid transparent;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 8%),
    0 2px 6px rgb(0 0 0 / 4%);
  transform: scale(1);
  transition:
    transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1),
    box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.25, 1),
    border-color 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: transform, box-shadow;
}

.apple-card:hover {
  border-color: rgb(0 0 0 / 6%);
  box-shadow:
    0 4px 12px rgb(0 0 0 / 10%),
    0 8px 24px rgb(0 0 0 / 6%),
    0 16px 48px rgb(0 0 0 / 4%);
  transform: scale(1.005);
}

.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.line-clamp-3 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
