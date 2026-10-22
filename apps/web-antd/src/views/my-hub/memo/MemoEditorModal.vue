<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { Memo } from '#/api/core/memo';

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import { usePreferences } from '@vben/preferences';

import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { Button, Input, message, Tooltip } from 'ant-design-vue';

import { createMemoApi, getMemoApi, updateMemoApi } from '#/api/core/memo';
import { AppModal as Modal } from '#/components/app-modal';
import ContentLoading from '#/components/ContentLoading.vue';

const props = defineProps<{ memo?: Memo; memoId?: string }>();
const emit = defineEmits<{ saved: [] }>();
const modalOpen = defineModel<boolean>('open', { default: false });
const modalTitle = computed(() =>
  props.memo?.id || props.memoId ? '编辑' : '新建',
);
const confirmLoading = ref(false);
const detailLoading = ref(false);
const detailError = ref(false);
let requestVersion = 0;
const modalWidthPx = ref<null | number>(null);
const modalHeightPx = ref<null | number>(null);
const modalOffset = reactive({ x: 0, y: 0 });
const { isMobile } = usePreferences();

const modalWidth = computed(() => {
  if (isMobile.value) return 'calc(100vw - 32px)';
  return modalWidthPx.value ?? 'min(860px, calc(100vw - 48px))';
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
      ? `${Math.max(200, modalHeightPx.value - 82)}px`
      : isMobile.value
        ? 'clamp(260px, 52dvh, 420px)'
        : 'clamp(260px, 42dvh, 420px)',
  maxHeight: 'calc(100dvh - 114px)',
  overflow: 'hidden',
}));

const editorStyle = computed<CSSProperties>(() => ({
  alignSelf: 'stretch',
  flex: '1 1 auto',
  minHeight: 0,
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

const resetModalSize = () => {
  stopModalResize?.();
  modalWidthPx.value = null;
  modalHeightPx.value = null;
  modalOffset.x = 0;
  modalOffset.y = 0;
};

const handleOk = async () => {
  if (confirmLoading.value || detailLoading.value || detailError.value) return;
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
    emit('saved');
  } finally {
    confirmLoading.value = false;
  }
};

async function loadMemo() {
  const version = ++requestVersion;
  detailError.value = false;
  detailLoading.value = false;
  Object.assign(formState, {
    id: '',
    title: '',
    content: '',
    hiddenContent: false,
  });
  if (!modalOpen.value) return;
  if (props.memo) {
    Object.assign(formState, props.memo);
    return;
  }
  if (!props.memoId) return;
  detailLoading.value = true;
  try {
    const memo = await getMemoApi(props.memoId);
    if (version === requestVersion && modalOpen.value)
      Object.assign(formState, memo);
  } catch {
    if (version === requestVersion) detailError.value = true;
  } finally {
    if (version === requestVersion) detailLoading.value = false;
  }
}

watch(() => [modalOpen.value, props.memoId, props.memo], loadMemo, {
  immediate: true,
});
onMounted(() => window.addEventListener('resize', resetModalSize));
onUnmounted(() => {
  requestVersion++;
  stopModalResize?.();
  window.removeEventListener('resize', resetModalSize);
});
</script>

<template>
  <Modal
    v-model:open="modalOpen"
    :confirm-loading="confirmLoading"
    :ok-button-props="{ disabled: detailLoading || detailError }"
    :mask-closable="false"
    :submit-on-enter="false"
    @ok="handleOk"
    :after-close="resetModalSize"
    :width="modalWidth"
    :centered="true"
    :body-style="modalBodyStyle"
    :style="modalStyle"
    class="memo-modal"
    :title="modalTitle"
  >
    <template #toolbar>
      <div class="memo-modal-title">
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
    <ContentLoading v-if="detailLoading" min-height="100%" />
    <div
      v-else-if="detailError"
      class="flex h-full items-center justify-center"
    >
      <Button @click="loadMemo">重新加载</Button>
    </div>
    <template v-else>
      <Input
        v-model:value="formState.title"
        placeholder="标题"
        class="memo-editor-title"
        aria-label="笔记标题"
        :bordered="false"
        style="flex-shrink: 0"
      />
      <Input.TextArea
        v-model:value="formState.content"
        placeholder="记下你的想法..."
        class="memo-editor-content"
        aria-label="笔记正文"
        :bordered="false"
        :style="editorStyle"
      />
    </template>
    <template #footer-leading>
      <Tooltip
        :title="
          formState.hiddenContent ? '在列表中显示正文' : '在列表中隐藏正文'
        "
      >
        <Button
          type="text"
          shape="circle"
          class="memo-visibility-button"
          :aria-label="
            formState.hiddenContent ? '在列表中显示正文' : '在列表中隐藏正文'
          "
          :aria-pressed="formState.hiddenContent"
          :disabled="confirmLoading || detailLoading || detailError"
          @click="formState.hiddenContent = !formState.hiddenContent"
        >
          <template #icon>
            <EyeOutlined v-if="formState.hiddenContent" />
            <EyeInvisibleOutlined v-else />
          </template>
        </Button>
      </Tooltip>
    </template>
  </Modal>
</template>

<style scoped>
:global(.memo-modal .app-modal-body) {
  gap: 12px;
  padding: var(--app-modal-padding-top) 32px 12px;
}

:global(.memo-modal .app-modal-footer) {
  padding: 16px 32px 20px;
}

:global(.memo-modal .app-modal-toolbar),
.memo-modal-title {
  display: contents;
}

:global(.memo-modal .ant-input) {
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: hsl(var(--foreground));
  box-shadow: none;
}

:global(.memo-modal .ant-input:hover),
:global(.memo-modal .ant-input:focus) {
  border: 0;
  box-shadow: none;
}

:global(.memo-modal .ant-input::placeholder) {
  color: hsl(var(--muted-foreground));
}

:global(.memo-modal .memo-editor-title) {
  min-height: 36px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
}

:global(.memo-modal .memo-editor-content) {
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.85;
  scrollbar-width: thin;
}

:global(.memo-modal .app-modal-footer .memo-visibility-button) {
  width: 44px;
  height: 44px;
  margin-left: -10px;
  color: hsl(var(--muted-foreground));
  font-size: 18px;
}

:global(.memo-modal .memo-visibility-button[aria-pressed='true']) {
  color: hsl(var(--primary));
}

:global(.memo-modal .memo-visibility-button:focus-visible) {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

@media (max-width: 767px) {
  :global(.memo-modal .app-modal-body) {
    padding: var(--app-modal-padding-top) 20px 8px;
  }

  :global(.memo-modal .app-modal-footer) {
    padding: 12px 20px 18px;
  }

  :global(.memo-modal .memo-editor-title) {
    font-size: 20px;
  }
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
</style>
