<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  PushpinFilled,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Empty,
  message,
  Spin,
  Tooltip,
} from 'ant-design-vue';

import {
  query as queryThink,
  update as updateThink,
} from '#/api/core/think';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';
import ThinkModal from './ThinkModal.vue';

interface Event {
  id: number | string;
  content: string;
  create_time: string;
}

interface Thought {
  id: number | string;
  content: string;
  events: Event[];
  likes: number;
  createTime: string;
  isPinned: number;
  hiddenContent: boolean;
}

const thoughts = ref<Thought[]>([]);
const loading = ref(false);

const thinkModalVisible = ref(false);
const editingThoughtId = ref<null | number | string>(null);

function openAddModal() {
  editingThoughtId.value = null;
  thinkModalVisible.value = true;
}

function openEditModal(id: number | string) {
  editingThoughtId.value = id;
  thinkModalVisible.value = true;
}

function onThoughtSaved(thought: any) {
  if (editingThoughtId.value === null) {
    thoughts.value.unshift(thought);
  } else {
    const idx = thoughts.value.findIndex((t) => t.id === editingThoughtId.value);
    if (idx !== -1) thoughts.value[idx] = thought;
  }
}

function onThoughtDeleted(id: number | string) {
  thoughts.value = thoughts.value.filter((t) => t.id !== id);
}

const handleToggleHide = async (item: Thought) => {
  try {
    const newHiddenState = !item.hiddenContent;
    await updateThink({ id: item.id, hiddenContent: newHiddenState });
    item.hiddenContent = newHiddenState;
    message.success(newHiddenState ? '内容已隐藏' : '内容已显示');
  } catch {
    // Error handled
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const padZero = (num: number) => num.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 生命周期
const loadThoughts = async () => {
  loading.value = true;
  try {
    const res = await queryThink({ page: 1, pageSize: 50, condition: {} });
    const list = (res && (res.items ?? res)) || [];
    thoughts.value = list
      .map((t: any) => ({
        ...t,
        isPinned: t?.isPinned ?? 0,
        hiddenContent: t?.hiddenContent ?? false,
        content: t?.content ?? t?.text ?? t?.title ?? t?.summary ?? '',
        events: Array.isArray(t?.events)
          ? t.events.map((e: any) => ({
              ...e,
              create_time:
                e?.create_time ?? e?.createTime ?? new Date().toISOString(),
            }))
          : [],
        date: t?.date ?? new Date().toISOString(),
        createTime: t?.createTime ?? t?.create_time ?? new Date().toISOString(),
      }))
      .toSorted(
        (a: Thought, b: Thought) =>
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime(),
      );
  } catch {
    message.error('加载失败');
  } finally {
    loading.value = false;
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

const thoughtColumns = computed(() => {
  const cols: Thought[][] = Array.from({ length: columnCount.value }, () => []);
  thoughts.value.forEach((item, index) => {
    cols[index % columnCount.value]?.push(item);
  });
  return cols;
});

onMounted(async () => {
  window.addEventListener('resize', onResize);
  await loadThoughts();
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="think-page">
    <Spin :spinning="loading">
      <template v-if="thoughts.length === 0 && !loading">
        <div class="empty-wrap">
          <Empty description="还没有任何思考记录，点击右下角或下方按钮添加">
            <Button
              type="primary"
              shape="round"
              size="large"
              @click="openAddModal"
            >
              <template #icon><PlusOutlined /></template>
              记录闪念
            </Button>
          </Empty>
        </div>
      </template>

      <div v-else class="cards-grid">
        <div
          v-for="(col, colIndex) in thoughtColumns"
          :key="colIndex"
          class="card-column"
        >
          <Card
            v-for="thought in col"
            :key="thought.id"
            hoverable
            :bordered="false"
            class="thought-card group relative"
            @click="openEditModal(thought.id)"
          >
            <div
              class="card-content"
              :class="{ 'is-hidden': thought.hiddenContent }"
            >
              {{ thought.content }}
            </div>
            <div class="card-footer">
              <span class="card-date">{{
                formatDate(thought.createTime)
              }}</span>
              <div style="display: flex; gap: 8px; align-items: center">
                <div
                  class="flex items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                >
                  <Tooltip
                    :title="thought.hiddenContent ? '显示内容' : '隐藏内容'"
                  >
                    <Button
                      type="text"
                      size="small"
                      shape="circle"
                      class="!text-slate-500 hover:bg-white/50 dark:hover:bg-black/20"
                      @click.stop="handleToggleHide(thought)"
                    >
                      <template #icon>
                        <EyeOutlined v-if="thought.hiddenContent" />
                        <EyeInvisibleOutlined v-else />
                      </template>
                    </Button>
                  </Tooltip>
                </div>
                <PushpinFilled
                  v-if="thought.isPinned === 1"
                  style="color: #faad14"
                />
                <div
                  class="event-badge"
                  v-if="(thought.events || []).length > 0"
                >
                  {{ (thought.events || []).length }}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Spin>

    <GlobalFloatBtn @click="openAddModal" />

    <ThinkModal
      v-model:visible="thinkModalVisible"
      :thought-id="editingThoughtId"
      @saved="onThoughtSaved"
      @deleted="onThoughtDeleted"
    />
  </div>
</template>

<style scoped>
.think-page {
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
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

@media (min-width: 640px) {
  .cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .cards-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.card-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.thought-card {
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  box-shadow: 0 2px 8px rgb(0, 0, 0, 0.04);
}

/* Mobile Adaptation */
@media (max-width: 768px) {
  .think-page {
    padding: 12px;
  }
}

.thought-card:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}

.thought-card :deep(.ant-card-body) {
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
  opacity: 0.85; /* 文字颜色自适应 */
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
  padding-top: 8px;
}

.card-date {
  font-size: 13px;
  opacity: 0.45;
}

.event-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary-bg, #e6f4ff);
  border-radius: 50%;
}

</style>
