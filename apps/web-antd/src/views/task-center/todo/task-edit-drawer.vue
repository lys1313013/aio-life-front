<script lang="ts" setup>
import { ref, watch } from 'vue';

import {
  CalendarOutlined,
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
  StarOutlined,
} from '@ant-design/icons-vue';
import { useMediaQuery } from '@vueuse/core';
import {
  Button as AButton,
  Checkbox as ACheckbox,
  DatePicker as ADatePicker,
  Drawer as ADrawer,
  Dropdown as ADropdown,
  Empty as AEmpty,
  Input as AInput,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Popconfirm as APopconfirm,
  Popover as APopover,
  Spin as ASpin,
  Tag as ATag,
  Textarea as ATextarea,
  message,
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

interface Detail {
  id: string;
  taskId: string;
  content: string;
  isCompleted: number;
  priority: number; // 1: very important, 10: important, 20: normal
  isStarred?: number;
  startTime?: any;
  endTime?: any;
}

interface Task {
  id: string;
  columnId?: string;
  content: string;
  detail?: string;
  startTime?: any;
  endTime?: any;
  dueDate?: any;
}

const props = defineProps<{
  open: boolean;
  task: null | Task;
}>();

const emit = defineEmits<{
  refresh: [taskId: string];
  'update:open': [open: boolean];
}>();

const { useToken } = theme;
const { token } = useToken();

const isMobile = useMediaQuery('(max-width: 768px)');

const localTask = ref<Task>({ id: '', content: '' });
const details = ref<Detail[]>([]);
const detailsLoading = ref(false);

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.task) return;
    localTask.value = {
      ...props.task,
      startTime: props.task.startTime ? dayjs(props.task.startTime) : undefined,
      endTime: props.task.endTime ? dayjs(props.task.endTime) : undefined,
      dueDate: props.task.dueDate ? dayjs(props.task.dueDate) : undefined,
    };
    details.value = [];
    detailsLoading.value = true;
    try {
      details.value = await getTaskDetail(props.task.id);
    } catch (error) {
      console.error('获取任务明细失败', error);
    } finally {
      detailsLoading.value = false;
    }
  },
);

const close = () => {
  emit('update:open', false);
};

// 序列化任务字段（dayjs → 后端字符串），剔除瞬态字段
const serializeTask = (task: Task) => ({
  id: task.id,
  columnId: task.columnId,
  content: task.content,
  detail: task.detail,
  startTime: task.startTime
    ? dayjs(task.startTime).format('YYYY-MM-DD HH:mm:ss')
    : undefined,
  endTime: task.endTime
    ? dayjs(task.endTime).format('YYYY-MM-DD HH:mm:ss')
    : undefined,
  dueDate: task.dueDate
    ? dayjs(task.dueDate).format('YYYY-MM-DD HH:mm:ss')
    : undefined,
});

// 字段失焦/变更即自动保存
const taskSaving = ref(false);
const saveTaskField = async () => {
  if (!localTask.value.id) return;
  taskSaving.value = true;
  try {
    await updateTask(serializeTask(localTask.value));
    emit('refresh', localTask.value.id);
  } catch (error) {
    console.error('保存任务失败', error);
  } finally {
    taskSaving.value = false;
  }
};

// --- 明细 ---
const serializeDetail = (detail: Detail) => ({
  ...detail,
  startTime: detail.startTime
    ? dayjs(detail.startTime).format('YYYY-MM-DD HH:mm:ss')
    : undefined,
  endTime: detail.endTime
    ? dayjs(detail.endTime).format('YYYY-MM-DD HH:mm:ss')
    : undefined,
});

const saveDetail = async (detail: Detail) => {
  if (!detail.content?.trim()) return;
  try {
    await updateTaskDetail(serializeDetail(detail));
    emit('refresh', localTask.value.id);
  } catch (error) {
    console.error('更新明细失败', error);
  }
};

const handleDetailCheck = async (detail: Detail, checked: boolean) => {
  detail.isCompleted = checked ? 1 : 0;
  try {
    await updateTaskDetail(serializeDetail(detail));
    emit('refresh', localTask.value.id);
  } catch (error) {
    console.error('更新状态失败', error);
    detail.isCompleted = checked ? 0 : 1;
  }
};

const handlePriorityChange = async (detail: Detail, priority: number) => {
  detail.priority = priority;
  await saveDetail(detail);
};

const getPriorityColor = (priority: number) => {
  if (priority === 1) return 'red';
  if (priority === 10) return 'orange';
  return 'default';
};

const getPriorityLabel = (priority: number) => {
  if (priority === 1) return '高';
  if (priority === 10) return '中';
  return '低';
};

const handleStar = async (detail: Detail) => {
  try {
    if (detail.isStarred === 1) {
      detail.isStarred = 0;
      await unstarTaskDetail(detail.id);
    } else {
      detail.isStarred = 1;
      await starTaskDetail(detail.id);
    }
  } catch (error) {
    console.error('更新星标失败', error);
  }
};

const onDetailTimeChange = async (detail: Detail, range: [any, any] | null) => {
  detail.startTime = range?.[0] ?? undefined;
  detail.endTime = range?.[1] ?? undefined;
  await saveDetail(detail);
};

const detailTimeValue = (detail: Detail): [any, any] => {
  return [
    detail.startTime ? dayjs(detail.startTime) : null,
    detail.endTime ? dayjs(detail.endTime) : null,
  ];
};

const removeDetail = async (index: number, detail: Detail) => {
  const hide = message.loading('删除中...', 0);
  try {
    await deleteTaskDetail(detail.id);
    details.value.splice(index, 1);
    emit('refresh', localTask.value.id);
  } catch (error) {
    console.error('删除明细失败', error);
  } finally {
    hide();
  }
};

const onDetailDragEnd = async () => {
  const sortedData = details.value.map((detail, index) => ({
    id: detail.id,
    sort: index + 1,
  }));
  try {
    await reSortTaskDetail(sortedData);
  } catch (error) {
    console.error('更新排序失败', error);
  }
};

// 底部内联快速添加明细
const newDetailContent = ref('');
const addingDetail = ref(false);
const submitNewDetail = async () => {
  const content = newDetailContent.value.trim();
  if (!content || addingDetail.value) return;
  addingDetail.value = true;
  try {
    const res = await addTaskDetail({
      content,
      taskId: localTask.value.id,
      isCompleted: 0,
      priority: 20,
    });
    details.value.unshift(res);
    newDetailContent.value = '';
    emit('refresh', localTask.value.id);
  } catch (error) {
    console.error('添加明细失败', error);
  } finally {
    addingDetail.value = false;
  }
};
</script>

<template>
  <ADrawer
    :open="open"
    :width="isMobile ? '100%' : 600"
    :closable="false"
    class="task-edit-drawer"
    @close="close"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="drawer-body">
      <!-- 标题 -->
      <div class="title-row">
        <AInput
          v-model:value="localTask.content"
          :bordered="false"
          placeholder="任务标题"
          class="task-title-input"
          @blur="saveTaskField"
        />
        <span v-if="taskSaving" class="saving-hint">
          <ASpin size="small" />
        </span>
      </div>

      <!-- 时间 -->
      <div class="field-group">
        <div class="field-item">
          <div class="field-label">开始时间</div>
          <ADatePicker
            show-time
            v-model:value="localTask.startTime"
            placeholder="设置开始时间"
            class="field-picker"
            @change="saveTaskField"
          />
        </div>
        <div class="field-item">
          <div class="field-label">结束时间</div>
          <ADatePicker
            show-time
            v-model:value="localTask.endTime"
            placeholder="设置结束时间"
            class="field-picker"
            @change="saveTaskField"
          />
        </div>
        <div class="field-item">
          <div class="field-label">目标完成时间</div>
          <ADatePicker
            show-time
            v-model:value="localTask.dueDate"
            placeholder="设置目标时间"
            class="field-picker"
            @change="saveTaskField"
          />
        </div>
      </div>

      <!-- 备注 -->
      <div class="field-group">
        <div class="field-label">备注</div>
        <ATextarea
          v-model:value="localTask.detail"
          placeholder="添加备注..."
          :auto-size="{ minRows: 2, maxRows: 6 }"
          @blur="saveTaskField"
        />
      </div>

      <!-- 明细 -->
      <div class="field-group">
        <div class="field-label detail-header">
          <span>明细</span>
          <span v-if="details.length > 0" class="detail-count">
            {{ details.filter((d) => d.isCompleted === 1).length }}/{{
              details.length
            }}
          </span>
        </div>

        <ASpin v-if="detailsLoading" size="small" />

        <draggable
          v-else
          v-model="details"
          item-key="id"
          handle=".drag-handle"
          class="detail-list"
          :animation="200"
          ghost-class="todo-detail-ghost"
          drag-class="todo-detail-drag"
          :force-fallback="true"
          :fallback-on-body="true"
          :fallback-tolerance="5"
          @end="onDetailDragEnd"
        >
          <template #item="{ element: detail, index }">
            <div class="detail-item">
              <HolderOutlined class="drag-handle" />
              <ACheckbox
                :checked="detail.isCompleted === 1"
                @update:checked="
                  (val: boolean) => handleDetailCheck(detail, val)
                "
              />
              <AInput
                v-model:value="detail.content"
                :bordered="false"
                placeholder="输入明细内容..."
                class="detail-input"
                :class="{ 'detail-completed': detail.isCompleted === 1 }"
                @blur="saveDetail(detail)"
              />
              <div class="detail-actions">
                <AButton
                  type="text"
                  size="small"
                  class="detail-action-btn"
                  @click="handleStar(detail)"
                >
                  <template #icon>
                    <StarOutlined
                      :style="{
                        color:
                          detail.isStarred === 1
                            ? token.colorWarning
                            : token.colorTextQuaternary,
                      }"
                    />
                  </template>
                </AButton>
                <ADropdown :trigger="['click']" placement="bottomRight">
                  <ATag
                    :color="getPriorityColor(detail.priority)"
                    class="priority-tag"
                  >
                    {{ getPriorityLabel(detail.priority) }}
                  </ATag>
                  <template #overlay>
                    <AMenu
                      @click="
                        ({ key }: any) =>
                          handlePriorityChange(detail, Number(key))
                      "
                    >
                      <AMenuItem key="1">
                        <ATag color="red" class="priority-option-tag">高</ATag>
                      </AMenuItem>
                      <AMenuItem key="10">
                        <ATag color="orange" class="priority-option-tag">
                          中
                        </ATag>
                      </AMenuItem>
                      <AMenuItem key="20">
                        <ATag color="default" class="priority-option-tag">
                          低
                        </ATag>
                      </AMenuItem>
                    </AMenu>
                  </template>
                </ADropdown>
                <APopover trigger="click" placement="bottomRight">
                  <AButton
                    type="text"
                    size="small"
                    class="detail-action-btn"
                    :class="{
                      'has-time': detail.startTime || detail.endTime,
                    }"
                  >
                    <template #icon><CalendarOutlined /></template>
                  </AButton>
                  <template #content>
                    <div class="time-popover">
                      <div class="time-popover-label">起止时间</div>
                      <ADatePicker.RangePicker
                        show-time
                        :value="detailTimeValue(detail)"
                        @change="
                          (range: any) => onDetailTimeChange(detail, range)
                        "
                      />
                    </div>
                  </template>
                </APopover>
                <APopconfirm
                  title="确定要删除这条明细吗?"
                  ok-text="确定"
                  cancel-text="取消"
                  trigger="click"
                  @confirm="removeDetail(index, detail)"
                >
                  <AButton
                    type="text"
                    danger
                    size="small"
                    class="detail-action-btn detail-delete-btn"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </AButton>
                </APopconfirm>
              </div>
            </div>
          </template>
        </draggable>

        <AEmpty
          v-if="!detailsLoading && details.length === 0"
          :image="AEmpty.PRESENTED_IMAGE_SIMPLE"
          description="暂无明细"
          class="detail-empty"
        />

        <!-- 内联快速添加明细 -->
        <div class="detail-add">
          <PlusOutlined class="detail-add-icon" />
          <AInput
            v-model:value="newDetailContent"
            :bordered="false"
            placeholder="添加明细，回车创建"
            class="detail-add-input"
            @press-enter="submitNewDetail"
          />
        </div>
      </div>
    </div>
  </ADrawer>
</template>

<style scoped>
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-title-input {
  padding: 4px 8px;
  margin-left: -8px;
  font-size: 20px;
  font-weight: 600;
}

.task-title-input:hover,
.task-title-input:focus {
  background: v-bind('token.colorFillQuaternary');
  border-radius: 8px;
}

.saving-hint {
  flex-shrink: 0;
  color: v-bind('token.colorTextTertiary');
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 769px) {
  .field-group:has(.field-item) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: v-bind('token.colorTextSecondary');
}

.field-picker {
  width: 100%;
}

.detail-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.detail-count {
  padding: 0 7px;
  font-size: 12px;
  line-height: 18px;
  color: v-bind('token.colorTextTertiary');
  background: v-bind('token.colorFillSecondary');
  border-radius: 9px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-item {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 3px 6px;
  margin: 0 -6px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.detail-item:hover {
  background: v-bind('token.colorFillQuaternary');
}

.detail-item:hover .drag-handle,
.detail-item:hover .detail-delete-btn {
  opacity: 1;
}

.drag-handle {
  flex-shrink: 0;
  margin-right: 4px;
  color: v-bind('token.colorTextQuaternary');
  cursor: grab;
  opacity: 0;
  transition: opacity 0.15s ease;
}

@media (hover: none) {
  .drag-handle,
  .detail-delete-btn {
    opacity: 1;
  }
}

.detail-input {
  flex: 1;
  min-width: 0;
}

.detail-completed {
  color: v-bind('token.colorTextQuaternary');
  text-decoration: line-through;
}

.detail-actions {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
}

.detail-action-btn {
  color: v-bind('token.colorTextTertiary');
}

.detail-action-btn.has-time {
  color: v-bind('token.colorPrimary');
}

.detail-delete-btn {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.priority-tag {
  margin-inline-end: 0;
  cursor: pointer;
  border-radius: 10px;
  user-select: none;
}

.priority-option-tag {
  width: 100%;
  margin-right: 0;
  text-align: center;
}

.time-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-popover-label {
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
}

.detail-empty {
  margin: 12px 0;
}

.detail-add {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 3px 6px;
  margin-top: 4px;
  color: v-bind('token.colorTextTertiary');
  border-radius: 8px;
  transition: background 0.15s ease;
}

.detail-add:focus-within,
.detail-add:hover {
  background: v-bind('token.colorFillQuaternary');
}

.detail-add-icon {
  flex-shrink: 0;
  margin-left: 2px;
  font-size: 13px;
}

.detail-add-input {
  flex: 1;
}
</style>
