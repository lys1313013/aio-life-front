<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { Detail, Task } from '#/api/core/todo';

import { computed, nextTick, ref, watch } from 'vue';

import {
  ArrowUpOutlined,
  CalendarOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  FlagOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  DatePicker as ADatePicker,
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Skeleton as ASkeleton,
  Spin as ASpin,
  Textarea as ATextarea,
  theme,
} from 'ant-design-vue';
import dayjs from 'dayjs';
import draggable from 'vuedraggable';

import {
  addTaskDetail,
  deleteTaskDetail,
  getTaskDetail,
  reSortTaskDetail,
  starTaskDetail,
  unstarTaskDetail,
  updateTask,
  updateTaskDetail,
} from '#/api/core/todo';
import { AppModal as AModal } from '#/components/app-modal';

import TaskDetailRow from './task-detail-row.vue';

const props = defineProps<{
  columnTitle?: string;
  open: boolean;
  task: null | Task;
}>();
const emit = defineEmits<{
  'update:open': [open: boolean];
  updated: [task: Partial<Task> & { id: string }];
}>();

const { token } = theme.useToken();
const themeVariables = computed(() => ({
  '--task-color-border-secondary': token.value.colorBorderSecondary,
  '--task-color-error-text': token.value.colorErrorText,
  '--task-color-fill-quaternary': token.value.colorFillQuaternary,
  '--task-color-fill-secondary': token.value.colorFillSecondary,
  '--task-color-primary': token.value.colorPrimary,
  '--task-color-success': token.value.colorSuccess,
  '--task-color-success-text': token.value.colorSuccessText,
  '--task-color-text': token.value.colorText,
  '--task-color-text-quaternary': token.value.colorTextQuaternary,
  '--task-color-text-secondary': token.value.colorTextSecondary,
  '--task-color-text-tertiary': token.value.colorTextTertiary,
  '--task-color-warning-text': token.value.colorWarningText,
  '--task-control-outline': token.value.controlOutline,
}));
const localTask = ref<Task>({ id: '', columnId: '', content: '' });
const dueDate = computed({
  get: () =>
    localTask.value.dueDate ? dayjs(localTask.value.dueDate) : undefined,
  set: (value: Dayjs | undefined) => {
    localTask.value.dueDate = value?.format('YYYY-MM-DD HH:mm:ss');
  },
});
const details = ref<Detail[]>([]);
const detailsLoading = ref(false);
const detailsError = ref(false);
const detailSaving = ref(new Set<string>());
const detailErrors = ref(new Set<string>());
const pinLoading = ref(new Set<string>());
const sorting = ref(false);
const completedExpanded = ref(false);
const noteExpanded = ref(false);
const completedDetails = computed(() =>
  details.value.filter((detail) => detail.isCompleted === 1),
);
const pendingDetails = computed({
  get: () => details.value.filter((detail) => detail.isCompleted !== 1),
  set: (value: Detail[]) => {
    details.value = [...value, ...completedDetails.value];
  },
});
const progress = computed(() =>
  details.value.length === 0
    ? 0
    : Math.round((completedDetails.value.length / details.value.length) * 100),
);

// 每次打开/切换任务建立独立会话，旧请求不能覆盖新面板。
let session = 0;
let loadVersion = 0;
const drafts = new Map<string, { content: string; priority: number }>();
const newDetailContent = ref('');
const newDetailPriority = ref(20);
const addingTasks = ref(new Set<string>());
const addingDetail = computed(() => addingTasks.value.has(localTask.value.id));
const composerInput = ref<{ focus: () => void }>();
const taskSaving = ref(0);
const taskSaveError = ref(false);
let taskSaveQueue = Promise.resolve();
let lastQueuedTask = '';
const savedDetails = new Map<string, string>();

function taskPayload(task: Task) {
  return {
    id: task.id,
    columnId: task.columnId,
    content: task.content.trim(),
    detail: task.detail ?? '',
    dueDate: task.dueDate,
  };
}

async function loadDetails() {
  const taskId = localTask.value.id;
  const version = ++loadVersion;
  detailsLoading.value = true;
  detailsError.value = false;
  try {
    const result = await getTaskDetail(taskId);
    if (version !== loadVersion) return;
    details.value = result.map((detail) => ({ ...detail }));
    savedDetails.clear();
    result.forEach((detail) =>
      savedDetails.set(detail.id, JSON.stringify(detail)),
    );
    emitCounts(taskId, details.value);
  } catch {
    if (version === loadVersion) detailsError.value = true;
  } finally {
    if (version === loadVersion) detailsLoading.value = false;
  }
}

watch(
  () => [props.open, props.task?.id] as const,
  ([open]) => {
    drafts.set(localTask.value.id, {
      content: newDetailContent.value,
      priority: newDetailPriority.value,
    });
    session++;
    loadVersion++;
    if (!open || !props.task) return;
    localTask.value = { ...props.task };
    const draft = drafts.get(props.task.id);
    newDetailContent.value = draft?.content ?? '';
    newDetailPriority.value = draft?.priority ?? 20;
    details.value = [];
    detailErrors.value.clear();
    completedExpanded.value = false;
    noteExpanded.value = Boolean(props.task.detail);
    taskSaving.value = 0;
    taskSaveError.value = false;
    lastQueuedTask = JSON.stringify(taskPayload(localTask.value));
    void loadDetails();
  },
  { immediate: true },
);

function emitCounts(taskId: string, records: Detail[]) {
  emit('updated', {
    id: taskId,
    unCompletedCount: records.filter((detail) => {
      const saved =
        taskId === localTask.value.id ? savedDetails.get(detail.id) : undefined;
      return (
        (saved
          ? (JSON.parse(saved) as Detail).isCompleted
          : detail.isCompleted) !== 1
      );
    }).length,
  });
}

async function saveTaskField() {
  const payload = taskPayload(localTask.value);
  if (!payload.id) return;
  if (!payload.content) {
    taskSaveError.value = true;
    return;
  }
  const signature = JSON.stringify(payload);
  if (signature === lastQueuedTask && !taskSaveError.value) return;
  lastQueuedTask = signature;
  const currentSession = session;
  taskSaving.value++;
  // 按编辑顺序保存，避免较早请求覆盖后续修改。
  taskSaveQueue = taskSaveQueue.then(async () => {
    try {
      await updateTask(payload);
      emit('updated', payload);
      if (currentSession === session) taskSaveError.value = false;
    } catch {
      if (currentSession === session) taskSaveError.value = true;
    } finally {
      if (currentSession === session) taskSaving.value--;
    }
  });
  await taskSaveQueue;
}

async function saveDetail(detail: Detail, patch: Partial<Detail> = {}) {
  if (detailSaving.value.has(detail.id)) return;
  const previous = { ...detail };
  const payload = { ...detail, ...patch };
  payload.content = payload.content.trim();
  if (!payload.content) {
    detailErrors.value.add(detail.id);
    return;
  }
  if (JSON.stringify(payload) === savedDetails.get(detail.id)) return;
  detail.content = payload.content;
  const currentSession = session;
  const records = details.value;
  detailSaving.value.add(detail.id);
  try {
    // 固定由专用接口更新，普通编辑不回写可能过期的固定状态。
    await updateTaskDetail({
      id: payload.id,
      content: payload.content,
      isCompleted: payload.isCompleted,
      priority: payload.priority,
      startTime: payload.startTime,
      endTime: payload.endTime,
    });
    Object.assign(detail, payload, { isStarred: detail.isStarred });
    if (currentSession === session) {
      savedDetails.set(detail.id, JSON.stringify(detail));
      detailErrors.value.delete(detail.id);
    }
    emitCounts(
      detail.taskId,
      currentSession === session ? details.value : records,
    );
  } catch {
    Object.assign(detail, previous, {
      content: payload.content,
      isStarred: detail.isStarred,
    });
    if (currentSession === session) detailErrors.value.add(detail.id);
  } finally {
    detailSaving.value.delete(detail.id);
  }
}

async function handleStar(detail: Detail) {
  if (pinLoading.value.has(detail.id) || detailSaving.value.has(detail.id))
    return;
  const pinned = detail.isStarred === 1;
  pinLoading.value.add(detail.id);
  try {
    await (pinned ? unstarTaskDetail(detail.id) : starTaskDetail(detail.id));
    detail.isStarred = pinned ? 0 : 1;
    // 固定接口只修改固定状态，保留尚未保存的内容签名。
    const saved = savedDetails.get(detail.id);
    if (saved) {
      savedDetails.set(
        detail.id,
        JSON.stringify({ ...JSON.parse(saved), isStarred: detail.isStarred }),
      );
    }
  } catch {
    // 请求客户端统一提示错误，保留原状态。
  } finally {
    pinLoading.value.delete(detail.id);
  }
}

async function removeDetail(detail: Detail) {
  if (detailSaving.value.has(detail.id)) return;
  const currentSession = session;
  const records = details.value;
  detailSaving.value.add(detail.id);
  try {
    await deleteTaskDetail(detail.id);
    const remaining = (
      currentSession === session ? details.value : records
    ).filter((item) => item.id !== detail.id);
    if (currentSession === session) {
      details.value = remaining;
      savedDetails.delete(detail.id);
    }
    emitCounts(detail.taskId, remaining);
  } catch {
    // 保留原记录，由请求客户端统一提示。
  } finally {
    detailSaving.value.delete(detail.id);
  }
}

const beforeSort = ref<Detail[]>([]);
async function onDetailDragEnd() {
  const currentSession = session;
  const previous = beforeSort.value;
  sorting.value = true;
  try {
    await reSortTaskDetail(
      details.value.map((detail, index) => ({
        id: detail.id,
        sortOrder: index + 1,
      })),
    );
  } catch {
    if (currentSession === session) details.value = previous;
  } finally {
    sorting.value = false;
  }
}

async function submitNewDetail() {
  const content = newDetailContent.value.trim();
  const taskId = localTask.value.id;
  if (
    !content ||
    addingDetail.value ||
    detailsLoading.value ||
    detailsError.value
  )
    return;
  const currentSession = session;
  const records = details.value;
  addingTasks.value.add(taskId);
  try {
    const result = await addTaskDetail({
      content,
      taskId,
      isCompleted: 0,
      priority: newDetailPriority.value,
    });
    const targetRecords = currentSession === session ? details.value : records;
    targetRecords.unshift(result);
    drafts.delete(taskId);
    if (currentSession === session) {
      savedDetails.set(result.id, JSON.stringify(result));
      newDetailContent.value = '';
      addingTasks.value.delete(taskId);
      await nextTick();
      composerInput.value?.focus();
    }
    emitCounts(taskId, targetRecords);
  } catch {
    // 失败保留输入，支持原地重试。
  } finally {
    addingTasks.value.delete(taskId);
  }
}

function onComposerKeydown(event: KeyboardEvent) {
  if (
    event.key !== 'Enter' ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
    return;
  event.preventDefault();
  if (!event.repeat) void submitNewDetail();
}

const priorities = [
  { value: 1, label: '高', className: 'priority-high' },
  { value: 10, label: '中', className: 'priority-medium' },
  { value: 20, label: '低', className: 'priority-low' },
];
const priorityInfo = (value: number) =>
  priorities.find((priority) => priority.value === value) ?? priorities[2]!;
</script>

<template>
  <AModal
    :open="open"
    width="min(760px, calc(100vw - 32px))"
    title="任务详情"
    :footer="false"
    :submit-on-enter="false"
    :body-style="{ padding: 0, overflow: 'hidden' }"
    class="task-edit-modal"
    @update:open="(value) => emit('update:open', value)"
  >
    <div class="task-editor" :style="themeVariables">
      <header class="editor-header">
        <div class="editor-context">
          <span v-if="columnTitle" class="column-context">{{
            columnTitle
          }}</span>
          <RightOutlined v-if="columnTitle" />
          <span>任务详情</span>
        </div>
        <div class="header-actions">
          <ASpin v-if="taskSaving > 0" size="small" aria-label="保存中" />
          <AButton
            type="text"
            aria-label="关闭任务详情"
            @click="emit('update:open', false)"
          >
            <template #icon><CloseOutlined /></template>
          </AButton>
        </div>
      </header>
      <div class="editor-body">
        <section class="task-overview">
          <ATextarea
            v-model:value="localTask.content"
            :bordered="false"
            :auto-size="{ minRows: 1 }"
            aria-label="任务标题"
            placeholder="任务标题"
            class="task-title-input"
            @blur="saveTaskField"
          />
          <div v-if="taskSaveError" class="save-error" role="alert">
            <span>{{
              localTask.content.trim() ? '修改未保存' : '任务标题不能为空'
            }}</span>
            <AButton type="link" size="small" @click="saveTaskField">
              重试
            </AButton>
          </div>
          <div class="task-properties">
            <CalendarOutlined class="property-icon" />
            <span class="property-label">截止时间</span>
            <ADatePicker
              v-model:value="dueDate"
              show-time
              :allow-clear="false"
              :bordered="false"
              format="YYYY-MM-DD HH:mm"
              placeholder="未设置"
              aria-label="任务截止时间"
              class="due-picker"
              @change="saveTaskField"
            />
          </div>
          <ATextarea
            v-if="noteExpanded || localTask.detail"
            v-model:value="localTask.detail"
            :bordered="false"
            :auto-size="{ minRows: 2, maxRows: 5 }"
            aria-label="任务备注"
            placeholder="添加备注…"
            class="task-note"
            @blur="saveTaskField"
          />
          <AButton
            v-else
            type="text"
            size="small"
            class="add-note"
            @click="noteExpanded = true"
          >
            <template #icon><PlusOutlined /></template>
            备注
          </AButton>
        </section>

        <section class="details-section" :aria-busy="detailsLoading || sorting">
          <div class="detail-heading">
            <h2>明细</h2>
            <span v-if="!detailsLoading && !detailsError" class="detail-count">
              {{ completedDetails.length }} / {{ details.length }}
            </span>
            <ASpin v-if="sorting" size="small" aria-label="排序中" />
            <div
              v-if="details.length > 0"
              class="detail-progress"
              role="progressbar"
              :aria-valuenow="progress"
              :aria-valuemin="0"
              :aria-valuemax="100"
              aria-label="明细完成进度"
            >
              <span :style="{ width: `${progress}%` }"></span>
            </div>
          </div>

          <div class="composer-sticky">
            <div class="detail-composer">
              <ATextarea
                ref="composerInput"
                v-model:value="newDetailContent"
                :bordered="false"
                :auto-size="{ minRows: 1, maxRows: 5 }"
                :disabled="addingDetail || detailsLoading || detailsError"
                aria-label="新增明细"
                placeholder="添加一条明细…"
                class="composer-input"
                @keydown="onComposerKeydown"
              />
              <div class="composer-toolbar">
                <ADropdown :trigger="['click']" :disabled="addingDetail">
                  <AButton
                    type="text"
                    size="small"
                    :class="priorityInfo(newDetailPriority).className"
                    :aria-label="`新增明细优先级：${priorityInfo(newDetailPriority).label}`"
                  >
                    <template #icon><FlagOutlined /></template>
                    {{ priorityInfo(newDetailPriority).label }}
                  </AButton>
                  <template #overlay>
                    <AMenu
                      @click="({ key }) => (newDetailPriority = Number(key))"
                    >
                      <AMenuItem
                        v-for="priority in priorities"
                        :key="priority.value"
                      >
                        <FlagOutlined :class="priority.className" />
                        {{ priority.label }}优先级
                      </AMenuItem>
                    </AMenu>
                  </template>
                </ADropdown>
                <span class="composer-shortcut"
                  >Enter 新增 · Shift + Enter 换行</span
                >
                <AButton
                  type="primary"
                  size="small"
                  :loading="addingDetail"
                  :disabled="
                    !newDetailContent.trim() ||
                    addingDetail ||
                    detailsLoading ||
                    detailsError
                  "
                  aria-label="添加明细"
                  class="composer-submit"
                  @click="submitNewDetail"
                >
                  <template #icon><ArrowUpOutlined /></template>
                </AButton>
              </div>
            </div>
          </div>

          <div
            v-if="detailsLoading && details.length === 0"
            class="details-placeholder"
          >
            <div v-for="index in 3" :key="index" class="detail-skeleton">
              <span class="skeleton-check"></span>
              <ASkeleton
                active
                :title="false"
                :paragraph="{ rows: 2, width: ['78%', '32%'] }"
              />
            </div>
          </div>
          <div v-else-if="detailsError" class="detail-empty" role="alert">
            <span>明细加载失败</span>
            <AButton type="text" aria-label="重新加载明细" @click="loadDetails">
              <template #icon><ReloadOutlined /></template>
            </AButton>
          </div>
          <template v-else>
            <draggable
              v-model="pendingDetails"
              item-key="id"
              handle=".drag-handle"
              class="detail-list"
              :animation="200"
              :disabled="sorting || detailSaving.size > 0 || addingDetail"
              ghost-class="todo-detail-ghost"
              drag-class="todo-detail-drag"
              :force-fallback="true"
              :fallback-on-body="true"
              :fallback-tolerance="5"
              @start="beforeSort = [...details]"
              @end="onDetailDragEnd"
            >
              <template #item="{ element: detail }">
                <TaskDetailRow
                  :detail="detail"
                  :saving="detailSaving.has(detail.id)"
                  :has-error="detailErrors.has(detail.id)"
                  :pinning="pinLoading.has(detail.id)"
                  :sorting="sorting"
                  @save="(patch) => saveDetail(detail, patch)"
                  @toggle-pin="handleStar(detail)"
                  @remove="removeDetail(detail)"
                />
              </template>
            </draggable>
            <div v-if="details.length === 0" class="detail-empty">
              <span class="empty-check"><CheckOutlined /></span>
              <span>还没有明细</span>
            </div>
            <div v-else-if="pendingDetails.length === 0" class="all-complete">
              <CheckOutlined /> 全部完成
            </div>
            <template v-if="completedDetails.length > 0">
              <button
                type="button"
                class="completed-toggle"
                :aria-expanded="completedExpanded"
                @click="completedExpanded = !completedExpanded"
              >
                <DownOutlined v-if="completedExpanded" /><RightOutlined
                  v-else
                />
                已完成 <span>{{ completedDetails.length }}</span>
              </button>
              <div v-if="completedExpanded" class="completed-list">
                <TaskDetailRow
                  v-for="detail in completedDetails"
                  :key="detail.id"
                  :detail="detail"
                  :saving="detailSaving.has(detail.id)"
                  :has-error="detailErrors.has(detail.id)"
                  :pinning="pinLoading.has(detail.id)"
                  :sorting="sorting"
                  @save="(patch) => saveDetail(detail, patch)"
                  @toggle-pin="handleStar(detail)"
                  @remove="removeDetail(detail)"
                />
              </div>
            </template>
          </template>
        </section>
      </div>
    </div>
  </AModal>
</template>

<style scoped>
.task-editor {
  display: flex;
  flex-direction: column;
  max-height: min(820px, calc(100dvh - 48px));
  color: var(--task-color-text);
}

.editor-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
}

.task-editor :deep(.ant-input-borderless:not(.task-note)) {
  background: transparent;
  border-color: transparent;
}

.editor-body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.editor-context,
.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.editor-context {
  min-width: 0;
  font-size: 12px;
  font-weight: 400;
  color: var(--task-color-text-tertiary);
}

.column-context {
  max-width: 220px;
  overflow: hidden;
  color: var(--task-color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-context :deep(.anticon-right) {
  font-size: 10px;
}

.task-overview {
  padding: 8px 28px 24px;
}

.task-title-input {
  padding: 4px 0;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.45;
  resize: none;
}

.task-title-input:focus,
.task-note:focus,
.detail-input:focus {
  box-shadow: none;
}

.task-properties {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
  font-size: 12px;
}

.property-icon,
.property-label {
  flex-shrink: 0;
  color: var(--task-color-text-tertiary);
}

.due-picker {
  width: 190px;
  padding: 4px 8px;
  background: var(--task-color-fill-quaternary);
  border-radius: 6px;
}

.due-picker :deep(input) {
  font-size: 12px;
}

.task-note {
  padding: 10px 12px;
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--task-color-text-secondary);
  background: var(--task-color-fill-quaternary);
  border-radius: 8px;
}

.add-note {
  margin: 10px 0 0 -6px;
  font-size: 12px;
  color: var(--task-color-text-tertiary);
}

.details-section {
  padding: 0 28px 28px;
}

.detail-heading {
  display: flex;
  gap: 10px;
  align-items: center;
  min-height: 32px;
}

.detail-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.detail-count {
  font-size: 12px;
  color: var(--task-color-text-tertiary);
  font-variant-numeric: tabular-nums;
}

.detail-progress {
  width: 80px;
  height: 4px;
  margin-left: auto;
  overflow: hidden;
  background: var(--task-color-fill-secondary);
  border-radius: 4px;
}

.detail-progress > span {
  display: block;
  height: 100%;
  background: var(--task-color-success);
  border-radius: inherit;
  transition: width 0.2s ease;
}

.composer-sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 10px 0 14px;
  background: hsl(var(--card));
}

.detail-composer {
  padding: 10px 10px 8px;
  background: var(--task-color-fill-quaternary);
  border: 1px solid var(--task-color-border-secondary);
  border-radius: 12px;
  transition: border-color 0.15s ease;
}

.detail-composer:focus-within {
  border-color: var(--task-color-primary);
  box-shadow: 0 0 0 2px var(--task-control-outline);
}

.composer-input {
  padding: 2px 4px 10px;
  line-height: 1.6;
}

.composer-input:focus {
  box-shadow: none;
}

.composer-toolbar {
  display: flex;
  gap: 6px;
  align-items: center;
}

.composer-shortcut {
  margin-left: auto;
  font-size: 11px;
  color: var(--task-color-text-quaternary);
}

.composer-submit {
  width: 28px;
  min-width: 28px;
  height: 28px;
  margin-left: auto;
  border-radius: 8px;
}

.composer-shortcut + .composer-submit {
  margin-left: 4px;
}

.detail-list {
  display: flex;
  flex-direction: column;
}

.composer-toolbar :deep(.ant-btn-text) {
  padding-inline: 6px;
  font-size: 12px;
}

.priority-high {
  color: var(--task-color-error-text);
}

.priority-medium {
  color: var(--task-color-warning-text);
}

.priority-low {
  color: var(--task-color-text-tertiary);
}

.detail-empty {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  min-height: 144px;
  font-size: 13px;
  color: var(--task-color-text-tertiary);
}

.empty-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--task-color-text-quaternary);
  background: var(--task-color-fill-quaternary);
  border-radius: 50%;
}

.all-complete {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 64px;
  font-size: 13px;
  color: var(--task-color-success-text);
}

.completed-toggle {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px 0;
  margin-top: 12px;
  font-size: 12px;
  color: var(--task-color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.completed-toggle :deep(.anticon) {
  font-size: 10px;
}

.completed-toggle:hover {
  color: var(--task-color-text);
}

.save-error {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--task-color-error-text);
}

.details-placeholder {
  min-height: 144px;
}

.detail-skeleton {
  display: flex;
  gap: 12px;
  padding: 14px 0;
}

.skeleton-check {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 4px;
  background: var(--task-color-fill-secondary);
  border-radius: 4px;
}

@media (max-width: 640px) {
  .task-overview {
    padding: 4px 20px 20px;
  }

  .details-section {
    padding-inline: 20px;
  }

  .task-title-input {
    font-size: 22px;
  }

  .composer-shortcut {
    display: none;
  }

  .composer-shortcut + .composer-submit {
    margin-left: auto;
  }
}

@media (pointer: coarse) {
  .composer-submit {
    width: 36px;
    height: 36px;
  }
}
</style>
