<script setup lang="ts">
import type { Memo } from '#/api/core/memo';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Empty,
  message,
  Popconfirm,
  Tooltip,
} from 'ant-design-vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { deleteMemoApi, getMemoListApi, updateMemoApi } from '#/api/core/memo';
import ContentLoading from '#/components/ContentLoading.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import MemoEditorModal from './MemoEditorModal.vue';

const memos = ref<Memo[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const editingMemo = ref<Memo>();

const fetchMemos = async () => {
  loading.value = true;
  try {
    const res = await getMemoListApi();
    // Use res as it is an array now based on previous fix
    memos.value = res || [];
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  editingMemo.value = undefined;
  modalOpen.value = true;
};

const handleEdit = (item: Memo) => {
  editingMemo.value = item;
  modalOpen.value = true;
};

const handleToggleHide = async (item: Memo) => {
  try {
    const newHiddenState = !item.hiddenContent;
    await updateMemoApi({ id: item.id, hiddenContent: newHiddenState });
    item.hiddenContent = newHiddenState;
  } catch {
    // Error handled
  }
};

const handleDelete = async (id: string) => {
  try {
    await deleteMemoApi(id);
    message.success('删除成功');
    fetchMemos();
  } catch {
    // Error is handled by request interceptor usually
  }
};

// 格式化时间
const formatTime = (time: string) => {
  try {
    return formatDistanceToNow(new Date(time), {
      addSuffix: true,
      locale: zhCN,
    });
  } catch {
    return time;
  }
};

const windowWidth = ref(window.innerWidth);

const onResize = () => {
  windowWidth.value = window.innerWidth;
};

const columnCount = computed(() => {
  if (windowWidth.value >= 1280) return 4;
  if (windowWidth.value >= 1024) return 3;
  if (windowWidth.value >= 640) return 2;
  return 2;
});

const memoColumns = computed(() => {
  const cols: Memo[][] = Array.from({ length: columnCount.value }, () => []);
  memos.value.forEach((item, index) => {
    cols[index % columnCount.value]?.push(item);
  });
  return cols;
});

onMounted(() => {
  window.addEventListener('resize', onResize);
  fetchMemos();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="memo-page">
    <ContentLoading v-if="loading" min-height="calc(100vh - 120px)" />
    <template v-else>
      <template v-if="memos.length === 0 && !loading">
        <div class="empty-wrap">
          <Empty description="暂无笔记，点击右下角或下方按钮添加">
            <Button
              type="primary"
              shape="round"
              size="large"
              @click="handleAdd"
            >
              <template #icon><PlusOutlined /></template>
              新建笔记
            </Button>
          </Empty>
        </div>
      </template>

      <div v-else class="cards-grid">
        <div
          v-for="(col, colIndex) in memoColumns"
          :key="colIndex"
          class="card-column"
        >
          <Card
            v-for="item in col"
            :key="item.id"
            hoverable
            :bordered="false"
            class="memo-card group relative"
            @click="handleEdit(item)"
          >
            <div
              class="card-content"
              :class="{ 'is-hidden': item.hiddenContent }"
            >
              <h3
                v-if="item.title"
                class="mb-1 truncate text-lg font-bold text-slate-800 dark:text-slate-200"
              >
                {{ item.title }}
              </h3>
              {{ item.content }}
            </div>

            <div class="card-footer">
              <span class="card-date">{{ formatTime(item.updateTime) }}</span>
              <div
                class="flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <Tooltip :title="item.hiddenContent ? '显示内容' : '隐藏内容'">
                  <Button
                    type="text"
                    size="small"
                    shape="circle"
                    class="!text-slate-500 hover:bg-white/50 dark:hover:bg-black/20"
                    @click.stop="handleToggleHide(item)"
                  >
                    <template #icon>
                      <EyeOutlined v-if="item.hiddenContent" />
                      <EyeInvisibleOutlined v-else />
                    </template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="确定要删除这条记录吗？"
                  ok-text="是"
                  cancel-text="否"
                  @confirm="handleDelete(item.id)"
                  @click.stop
                >
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      class="!text-slate-500 hover:bg-white/50 hover:!text-red-500 dark:hover:bg-black/20"
                    >
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </template>

    <MemoEditorModal
      v-model:open="modalOpen"
      :memo="editingMemo"
      @saved="fetchMemos"
    />

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.memo-page {
  max-width: 1400px;
  padding: 16px;
  margin: 0 auto;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 60px 20px;
  background: transparent;
}

.cards-grid {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.card-column {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.memo-card {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  box-shadow: 0 2px 8px rgb(0, 0, 0, 0.04);
}

/* Mobile Adaptation */
@media (max-width: 768px) {
  .cards-grid {
    gap: 12px;
  }

  .card-column {
    gap: 12px;
  }

  .memo-card :deep(.ant-card-body) {
    padding: 12px;
  }
}

.memo-card:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}

.memo-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 16px 12px;
}

.card-content {
  display: -webkit-box;
  flex: 1;
  margin-bottom: 12px;
  overflow: hidden;
  font-size: 15px;
  line-height: 1.7;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
  word-break: break-word;
  white-space: pre-wrap;
  opacity: 0.85;
  transition: filter 0.3s ease;
}

.card-content.is-hidden {
  filter: blur(5px);
  user-select: none;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.card-date {
  font-size: 13px;
  opacity: 0.45;
}
</style>
