<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { Memo } from '#/api/core/memo';

import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

import { usePreferences } from '@vben/preferences';

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
  Input,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import {
  createMemoApi,
  deleteMemoApi,
  getMemoListApi,
  updateMemoApi,
} from '#/api/core/memo';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

const memos = ref<Memo[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const modalTitle = ref('新建');
const confirmLoading = ref(false);
const modalWidthPx = ref<null | number>(null);
const modalHeightPx = ref<null | number>(null);
const modalOffset = reactive({ x: 0, y: 0 });
const { isMobile } = usePreferences();

const modalWidth = computed(() => {
  if (isMobile.value) return 'calc(100vw - 32px)';
  return modalWidthPx.value ?? '70%';
});

const modalStyle = computed<CSSProperties>(() =>
  isMobile.value
    ? {}
    : {
        transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)`,
      },
);

const modalBodyStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  flexDirection: 'column',
  height:
    !isMobile.value && modalHeightPx.value
      ? `${Math.max(160, modalHeightPx.value - 116)}px`
      : undefined,
  maxHeight: isMobile.value ? '80dvh' : '85dvh',
  overflow: 'auto',
}));

const editorStyle = computed<CSSProperties>(() => ({
  alignSelf: 'stretch',
  flex: !isMobile.value && modalHeightPx.value ? '1 1 auto' : '0 0 auto',
  minHeight: isMobile.value ? '30dvh' : '160px',
  height:
    !isMobile.value && modalHeightPx.value
      ? undefined
      : isMobile.value
        ? '40dvh'
        : '50dvh',
  maxHeight: !isMobile.value && modalHeightPx.value ? undefined : '75dvh',
  resize: 'none',
  width: '100%',
}));

const resizeDirections = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
type ResizeDirection = (typeof resizeDirections)[number];

let stopModalResize: (() => void) | undefined;

const startModalResize = (event: PointerEvent, direction: ResizeDirection) => {
  if (isMobile.value) return;

  const modal = (event.currentTarget as HTMLElement).closest(
    '.ant-modal',
  ) as HTMLElement | null;
  if (!modal) return;

  event.preventDefault();
  stopModalResize?.();

  const rect = modal.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const startOffsetX = modalOffset.x;
  const startOffsetY = modalOffset.y;
  const minWidth = Math.min(480, window.innerWidth - 32);
  const minHeight = Math.min(400, window.innerHeight - 32);
  const maxWidth = direction.includes('e')
    ? window.innerWidth - rect.left - 16
    : direction.includes('w')
      ? rect.right - 16
      : window.innerWidth - 32;
  const maxHeight = direction.includes('s')
    ? window.innerHeight - rect.top - 16
    : direction.includes('n')
      ? rect.bottom - 16
      : window.innerHeight - 32;

  modalWidthPx.value = rect.width;
  modalHeightPx.value = rect.height;
  document.body.style.userSelect = 'none';

  const onPointerMove = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;

    if (direction.includes('e') || direction.includes('w')) {
      const desiredWidth = direction.includes('e')
        ? rect.width + deltaX
        : rect.width - deltaX;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, desiredWidth));
      const widthDelta = nextWidth - rect.width;
      modalWidthPx.value = nextWidth;
      modalOffset.x =
        startOffsetX + (direction.includes('e') ? widthDelta : -widthDelta) / 2;
    }

    if (direction.includes('n') || direction.includes('s')) {
      const desiredHeight = direction.includes('s')
        ? rect.height + deltaY
        : rect.height - deltaY;
      const nextHeight = Math.min(
        maxHeight,
        Math.max(minHeight, desiredHeight),
      );
      const heightDelta = nextHeight - rect.height;
      modalHeightPx.value = nextHeight;
      modalOffset.y =
        startOffsetY +
        (direction.includes('s') ? heightDelta : -heightDelta) / 2;
    }
  };

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    document.body.style.removeProperty('user-select');
    stopModalResize = undefined;
  };

  stopModalResize = onPointerUp;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
};

const formState = reactive({
  id: '',
  title: '',
  content: '',
  hiddenContent: false,
});

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
  modalTitle.value = '新建';
  formState.id = '';
  formState.title = '';
  formState.content = '';
  formState.hiddenContent = false;
  modalOpen.value = true;
};

const handleEdit = (item: Memo) => {
  modalTitle.value = '编辑';
  formState.id = item.id;
  formState.title = item.title;
  formState.content = item.content;
  formState.hiddenContent = item.hiddenContent ?? false;
  modalOpen.value = true;
};

const resetModalSize = () => {
  stopModalResize?.();
  modalWidthPx.value = null;
  modalHeightPx.value = null;
  modalOffset.x = 0;
  modalOffset.y = 0;
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

const handleOk = async () => {
  if (!formState.content && !formState.title) {
    message.warning('请输入内容');
    return;
  }
  confirmLoading.value = true;
  try {
    await (formState.id
      ? updateMemoApi({ ...formState })
      : createMemoApi({ ...formState }));
    modalOpen.value = false;
    fetchMemos();
  } finally {
    confirmLoading.value = false;
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
  stopModalResize?.();
  window.removeEventListener('resize', onResize);
});
</script>

<template>
  <div class="memo-page">
    <Spin :spinning="loading">
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
    </Spin>

    <Modal
      v-model:open="modalOpen"
      :confirm-loading="confirmLoading"
      :mask-closable="false"
      @ok="handleOk"
      @after-close="resetModalSize"
      :width="modalWidth"
      :centered="true"
      :body-style="modalBodyStyle"
      :style="modalStyle"
      class="memo-modal"
    >
      <template #title>
        <div class="memo-modal-title">
          <span>{{ modalTitle }}</span>
          <template v-if="!isMobile">
            <i
              v-for="direction in resizeDirections"
              :key="direction"
              :class="`memo-resize-handle memo-resize-handle-${direction}`"
              aria-hidden="true"
              @pointerdown="startModalResize($event, direction)"
            ></i>
          </template>
        </div>
      </template>
      <Input
        v-model:value="formState.title"
        placeholder="标题"
        class="!mb-2 !border-0 !px-0 !text-lg !font-bold focus:!shadow-none"
        :bordered="false"
        style="flex-shrink: 0"
      />
      <Input.TextArea
        v-model:value="formState.content"
        placeholder="记下你的想法..."
        class="!border-0 !px-0 !text-base !leading-relaxed focus:!shadow-none"
        :bordered="false"
        :style="editorStyle"
      />
      <div
        class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800"
        style="flex-shrink: 0"
      >
        <Tooltip :title="formState.hiddenContent ? '显示内容' : '隐藏内容'">
          <Button
            type="text"
            shape="circle"
            @click="formState.hiddenContent = !formState.hiddenContent"
            :class="
              formState.hiddenContent
                ? '!text-slate-400'
                : '!text-slate-600 dark:!text-slate-300'
            "
          >
            <template #icon>
              <EyeOutlined v-if="formState.hiddenContent" />
              <EyeInvisibleOutlined v-else />
            </template>
          </Button>
        </Tooltip>
      </div>
    </Modal>

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.memo-page {
  max-width: 1400px;
  padding: 16px;
  margin: 0 auto;
}

.memo-modal-title {
  padding-right: 32px;
}

.memo-resize-handle {
  position: absolute;
  z-index: 10;
  display: block;
  touch-action: none;
}

.memo-resize-handle-n,
.memo-resize-handle-s {
  right: 12px;
  left: 12px;
  height: 10px;
  cursor: ns-resize;
}

.memo-resize-handle-e,
.memo-resize-handle-w {
  top: 12px;
  bottom: 12px;
  width: 10px;
  cursor: ew-resize;
}

.memo-resize-handle-n {
  top: -5px;
}

.memo-resize-handle-e {
  right: -5px;
}

.memo-resize-handle-s {
  bottom: -5px;
}

.memo-resize-handle-w {
  left: -5px;
}

.memo-resize-handle-ne,
.memo-resize-handle-nw,
.memo-resize-handle-se,
.memo-resize-handle-sw {
  width: 14px;
  height: 14px;
}

.memo-resize-handle-ne,
.memo-resize-handle-sw {
  cursor: nesw-resize;
}

.memo-resize-handle-nw,
.memo-resize-handle-se {
  cursor: nwse-resize;
}

.memo-resize-handle-ne,
.memo-resize-handle-nw {
  top: -7px;
}

.memo-resize-handle-se,
.memo-resize-handle-sw {
  bottom: -7px;
}

.memo-resize-handle-ne,
.memo-resize-handle-se {
  right: -7px;
}

.memo-resize-handle-nw,
.memo-resize-handle-sw {
  left: -7px;
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
