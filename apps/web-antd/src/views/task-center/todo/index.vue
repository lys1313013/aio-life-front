<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Dropdown as ADropdown,
  Input as AInput,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Spin as ASpin,
  Tag as ATag,
  Textarea as ATextarea,
  message,
  theme,
} from 'ant-design-vue';
import dayjs from 'dayjs';
import draggable from 'vuedraggable';

import {
  deleteColumn,
  deleteTask,
  getTaskColumnList,
  getTaskList,
  reSortColumn,
  reSortTask,
  saveColumn,
  saveTask,
  updateColumn,
} from '#/api/core/todo';

import TaskEditDrawer from './task-edit-drawer.vue';

interface Task {
  id: string;
  columnId?: string;
  content: string;
  detail?: string;
  unCompletedCount?: number;
  startTime?: any;
  endTime?: any;
  dueDate?: any;
}

interface Column {
  bgColor?: string;
  id: string;
  tasks: Task[];
  title: string;
}

const { useToken } = theme;
const { token } = useToken();

const isBlankColor = (color?: string) => {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  return ['', '#fff', '#ffffff', 'transparent', 'white'].includes(c);
};

// 列背景：未设置时用浅灰（飞书式）
const getColumnBg = (column: Column) => {
  return isBlankColor(column.bgColor)
    ? token.value.colorFillAlter
    : column.bgColor;
};

// 截止日期徽章：今天=蓝、逾期=红、3 天内=橙、其余灰
const getDueBadge = (dueDate: any) => {
  if (!dueDate) return null;
  const d = dayjs(dueDate);
  const now = dayjs();
  if (d.isBefore(now)) {
    return { text: `已逾期 ${d.format('MM-DD')}`, color: 'red' };
  }
  if (d.isSame(now, 'day')) {
    return { text: `今天 ${d.format('HH:mm')}`, color: 'blue' };
  }
  if (d.diff(now, 'day', true) <= 3) {
    return { text: d.format('MM-DD HH:mm'), color: 'orange' };
  }
  return { text: d.format('MM-DD'), color: 'default' };
};

const columns = ref<Column[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await getTaskColumnList({});
    columns.value = res.items.map((item: any) => ({
      ...item,
      tasks: item.tasks || [],
    }));

    const tasksRes = await getTaskList({});
    columns.value.forEach((column) => {
      column.tasks = tasksRes.items.filter(
        (item: { columnId: string }) => item.columnId === column.id,
      );
    });
  } catch (error) {
    console.error('初始化数据失败', error);
  } finally {
    loading.value = false;
  }
});

// --- 快速添加任务（列底内联输入，回车连续创建） ---
const addingTaskColumnId = ref<null | string>(null);
const newTaskContent = ref('');
const quickAddLoading = ref(false);

const startQuickAdd = (columnId: string) => {
  addingTaskColumnId.value = columnId;
  newTaskContent.value = '';
};

const cancelQuickAdd = () => {
  addingTaskColumnId.value = null;
  newTaskContent.value = '';
};

const submitNewTask = async (column: Column) => {
  const content = newTaskContent.value.trim();
  if (!content || quickAddLoading.value) return;
  quickAddLoading.value = true;
  try {
    const savedTask = await saveTask({
      content,
      detail: '',
      columnId: column.id,
    });
    column.tasks.push(savedTask);
    newTaskContent.value = '';
  } finally {
    quickAddLoading.value = false;
  }
};

// --- 添加列（末尾内联输入） ---
const addingColumn = ref(false);
const newColumnName = ref('');
const columnAddLoading = ref(false);

const submitNewColumn = async () => {
  const title = newColumnName.value.trim();
  if (!title || columnAddLoading.value) return;
  columnAddLoading.value = true;
  try {
    const savedColumn = await saveColumn({ title, tasks: [] });
    columns.value.push({ ...savedColumn, tasks: [] });
    newColumnName.value = '';
    addingColumn.value = false;
  } finally {
    columnAddLoading.value = false;
  }
};

// --- 拖拽排序 ---
const onDragEnd = async (event: any) => {
  const toColumnId = event.to.dataset.columnId;
  const toColumn = columns.value.find((col) => col.id === toColumnId);
  if (!toColumn) return;

  const sortedTasks = toColumn.tasks.map((task, index) => ({
    id: task.id,
    columnId: toColumnId,
    sortOrder: index + 1,
  }));

  await reSortTask(sortedTasks);
};

const onColumnDragEnd = async () => {
  const sortedData = columns.value.map((col, index) => ({
    id: col.id,
    sortOrder: index + 1,
  }));
  await reSortColumn(sortedData);
};

// --- 任务编辑抽屉 ---
const drawerOpen = ref(false);
const selectedTask = ref<null | Task>(null);

const openEditDrawer = (task: Task) => {
  selectedTask.value = task;
  drawerOpen.value = true;
};

const refreshTask = async (taskId: string) => {
  try {
    const res = await getTaskList({ taskId });
    if (res.items) {
      const task = res.items.find((t: any) => t.id === taskId);
      if (task) {
        columns.value.forEach((col) => {
          const idx = col.tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            col.tasks[idx] = task;
          }
        });
      }
    }
  } catch (error) {
    console.error('刷新任务失败', error);
  }
};

const deleteTaskFunc = async (taskId: string) => {
  const hide = message.loading('删除中...', 0);
  try {
    await deleteTask({ id: taskId });
    columns.value.forEach((column) => {
      column.tasks = column.tasks.filter((task) => task.id !== taskId);
    });
  } finally {
    hide();
  }
};

// --- 列编辑/删除 ---
const confirmDeleteColumn = (columnId: string) => {
  AModal.confirm({
    title: '确认删除列',
    content: '删除列将同时删除该列下的所有任务，确定要删除吗？',
    okText: '确定',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      deleteColumnMethod(columnId);
    },
  });
};

const deleteColumnMethod = async (columnId: string) => {
  const hide = message.loading('删除中...', 0);
  try {
    await deleteColumn({ id: columnId });
    columns.value = columns.value.filter((col) => col.id !== columnId);
  } finally {
    hide();
  }
};

const editColumnModalVisible = ref(false);
const editingColumn = ref({
  id: '',
  title: '',
  bgColor: '',
});

// 预设列背景色
const columnColorPresets = [
  '',
  '#e8f4ff',
  '#e6ffed',
  '#fff7e6',
  '#fff0f6',
  '#f9f0ff',
  '#e6fffb',
  '#ffece8',
];

const openEditColumnModal = (column: Column) => {
  editingColumn.value = {
    id: column.id,
    title: column.title,
    bgColor: column.bgColor || '',
  };
  editColumnModalVisible.value = true;
};

const columnSaving = ref(false);
const handleEditColumnOk = async () => {
  const column = columns.value.find((col) => col.id === editingColumn.value.id);
  if (column) {
    column.title = editingColumn.value.title;
    column.bgColor = editingColumn.value.bgColor;
    columnSaving.value = true;
    try {
      await updateColumn(column);
      editColumnModalVisible.value = false;
    } finally {
      columnSaving.value = false;
    }
  }
};

// 输入框自动聚焦（兼容 Ant 组件包裹）
const vFocus = {
  mounted: (el: HTMLElement) => {
    nextTick(() => {
      const input = el.querySelector('textarea, input');
      (input as HTMLElement | null)?.focus();
    });
  },
};
</script>

<template>
  <div class="kanban-board">
    <div v-if="loading" class="loading-wrapper">
      <ASpin size="large" />
    </div>
    <template v-else>
      <draggable
        v-model="columns"
        group="columns"
        item-key="id"
        class="columns-container"
        handle=".column-header"
        :animation="200"
        ghost-class="todo-column-ghost"
        drag-class="todo-column-drag"
        :force-fallback="true"
        :fallback-on-body="true"
        :fallback-tolerance="5"
        @end="onColumnDragEnd"
      >
        <template #item="{ element: column }">
          <div
            class="kanban-column"
            :style="{ backgroundColor: getColumnBg(column) }"
          >
            <div class="column-header">
              <div class="header-left">
                <span
                  class="column-title"
                  @click.stop="openEditColumnModal(column)"
                >
                  {{ column.title }}
                </span>
                <span class="task-count">{{ column.tasks.length }}</span>
              </div>

              <ADropdown :trigger="['click']">
                <AButton type="text" size="small" class="more-btn" @click.stop>
                  <template #icon><MoreOutlined /></template>
                </AButton>
                <template #overlay>
                  <AMenu>
                    <AMenuItem key="edit" @click="openEditColumnModal(column)">
                      <EditOutlined /> 编辑
                    </AMenuItem>
                    <AMenuItem
                      key="delete"
                      danger
                      @click="confirmDeleteColumn(column.id)"
                    >
                      <DeleteOutlined /> 删除
                    </AMenuItem>
                  </AMenu>
                </template>
              </ADropdown>
            </div>

            <draggable
              v-model="column.tasks"
              group="tasks"
              item-key="id"
              :data-column-id="column.id"
              class="task-list"
              :animation="200"
              ghost-class="todo-task-ghost"
              drag-class="todo-task-drag"
              :force-fallback="true"
              :fallback-on-body="true"
              :fallback-tolerance="5"
              @end="onDragEnd"
            >
              <template #item="{ element }">
                <div class="kanban-task" @click="openEditDrawer(element)">
                  <div class="task-header">
                    <span class="task-title">{{ element.content }}</span>
                    <APopconfirm
                      title="确定要删除这个任务吗?"
                      ok-text="确定"
                      cancel-text="取消"
                      trigger="click"
                      @confirm="deleteTaskFunc(element.id)"
                    >
                      <AButton
                        type="text"
                        size="small"
                        danger
                        class="delete-task-btn"
                        @click.stop
                      >
                        <template #icon><DeleteOutlined /></template>
                      </AButton>
                    </APopconfirm>
                  </div>

                  <div v-if="element.detail" class="task-detail-text">
                    {{ element.detail }}
                  </div>

                  <div class="task-footer">
                    <span
                      v-if="element.unCompletedCount === 0"
                      class="done-badge"
                    >
                      <CheckCircleOutlined />
                      全部完成
                    </span>
                    <span v-else class="todo-count">
                      <ClockCircleOutlined />
                      待办 {{ element.unCompletedCount ?? 0 }}
                    </span>
                    <ATag
                      v-if="getDueBadge(element.dueDate)"
                      :color="getDueBadge(element.dueDate)?.color"
                      class="due-badge"
                    >
                      <CalendarOutlined />
                      {{ getDueBadge(element.dueDate)?.text }}
                    </ATag>
                  </div>
                </div>
              </template>

              <template #footer>
                <div
                  v-if="addingTaskColumnId === column.id"
                  class="quick-add-editor"
                >
                  <ATextarea
                    v-model:value="newTaskContent"
                    v-focus
                    :auto-size="{ minRows: 1, maxRows: 4 }"
                    placeholder="输入任务标题，回车创建"
                    class="quick-add-input"
                    @press-enter.prevent="submitNewTask(column)"
                    @keydown.esc="cancelQuickAdd"
                  />
                  <div class="quick-add-actions">
                    <AButton size="small" @click="cancelQuickAdd">
                      取消
                    </AButton>
                    <AButton
                      type="primary"
                      size="small"
                      :loading="quickAddLoading"
                      @click="submitNewTask(column)"
                    >
                      添加
                    </AButton>
                  </div>
                </div>
                <div
                  v-else
                  class="quick-add-trigger"
                  @click="startQuickAdd(column.id)"
                >
                  <PlusOutlined />
                  <span>添加任务</span>
                </div>
              </template>
            </draggable>
          </div>
        </template>

        <template #footer>
          <div v-if="addingColumn" class="add-column-editor">
            <AInput
              v-model:value="newColumnName"
              v-focus
              placeholder="输入列名称，回车创建"
              @press-enter="submitNewColumn"
              @keydown.esc="addingColumn = false"
            />
            <div class="quick-add-actions">
              <AButton size="small" @click="addingColumn = false">取消</AButton>
              <AButton
                type="primary"
                size="small"
                :loading="columnAddLoading"
                @click="submitNewColumn"
              >
                添加
              </AButton>
            </div>
          </div>
          <div v-else class="add-column-trigger" @click="addingColumn = true">
            <PlusOutlined />
            <span>添加列</span>
          </div>
        </template>
      </draggable>
    </template>

    <TaskEditDrawer
      v-model:open="drawerOpen"
      :task="selectedTask"
      @refresh="refreshTask"
    />

    <!-- 编辑列弹窗 -->
    <AModal
      v-model:open="editColumnModalVisible"
      :title="null"
      centered
      :confirm-loading="columnSaving"
      @ok="handleEditColumnOk"
    >
      <div class="edit-column-section" style="margin-top: 8px">
        <div class="edit-column-label">列名称</div>
        <AInput v-model:value="editingColumn.title" placeholder="列名称" />
      </div>
      <div class="edit-column-section">
        <div class="edit-column-label">背景颜色</div>
        <div class="color-presets">
          <span
            v-for="color in columnColorPresets"
            :key="color || 'default'"
            class="color-preset"
            :class="{ active: editingColumn.bgColor === color }"
            :style="{
              backgroundColor: isBlankColor(color)
                ? token.colorFillAlter
                : color,
            }"
            :title="color || '默认'"
            @click="editingColumn.bgColor = color"
          ></span>
        </div>
        <AInput
          v-model:value="editingColumn.bgColor"
          placeholder="自定义颜色代码，如 #e8f4ff"
          style="margin-top: 10px"
        />
      </div>
    </AModal>
  </div>
</template>

<style scoped>
.kanban-board {
  position: relative;
  height: calc(100vh - 40px);
  padding: 16px 20px 20px;
  overflow: auto hidden;
  background: v-bind('token.colorBgLayout');
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* 横向滚动条 */
.kanban-board::-webkit-scrollbar {
  height: 6px;
}

.kanban-board::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: v-bind('token.colorFillSecondary');
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: v-bind('token.colorFill');
}

.columns-container {
  display: flex;
  gap: 12px;
  align-items: stretch;
  width: max-content;
  min-width: 100%;
  height: 100%;
}

/* 飞书式浅灰圆角列：撑满全高 */
.kanban-column {
  display: flex;
  flex: 0 0 296px;
  flex-direction: column;
  width: 296px;
  height: 100%;
  padding: 4px 8px 8px;
  border-radius: 14px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 6px;
  cursor: grab;
}

.column-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.column-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: v-bind('token.colorText');
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.column-title:hover {
  color: v-bind('token.colorPrimary');
}

.task-count {
  min-width: 20px;
  padding: 0 7px;
  font-size: 12px;
  line-height: 18px;
  color: v-bind('token.colorTextSecondary');
  text-align: center;
  background: v-bind('token.colorFillSecondary');
  border-radius: 9px;
}

.more-btn {
  color: v-bind('token.colorTextTertiary');
}

.task-list {
  flex: 1;
  min-height: 40px;
  padding: 2px;
  overflow-y: auto;
}

.task-list::-webkit-scrollbar {
  width: 4px;
}

.task-list::-webkit-scrollbar-thumb {
  background: v-bind('token.colorFillSecondary');
  border-radius: 2px;
}

/* 任务卡片：无边框，轻阴影 */
.kanban-task {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: grab;
  background: v-bind('token.colorBgElevated');
  border: none;
  border-radius: 10px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 4%);
}

.kanban-task:active {
  cursor: grabbing;
}

.task-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.task-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: v-bind('token.colorText');
  word-break: break-word;
}

.delete-task-btn {
  flex-shrink: 0;
  margin: -4px -4px 0 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.kanban-task:hover .delete-task-btn {
  opacity: 1;
}

@media (hover: none) {
  .delete-task-btn {
    opacity: 1;
  }
}

.task-detail-text {
  display: -webkit-box;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: v-bind('token.colorTextSecondary');
  word-break: break-all;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.task-footer {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  font-size: 12px;
  color: v-bind('token.colorTextTertiary');
}

.todo-count,
.done-badge {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.done-badge {
  padding: 0 8px;
  font-size: 11px;
  line-height: 18px;
  color: v-bind('token.colorSuccess');
  background: v-bind('token.colorSuccessBg');
  border-radius: 9px;
}

.due-badge {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-inline-end: 0;
  font-size: 11px;
  border-radius: 9px;
}

/* 列底快速添加任务 */
.quick-add-trigger {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  margin-top: 2px;
  font-size: 13px;
  color: v-bind('token.colorTextSecondary');
  cursor: pointer;
  border-radius: 8px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.quick-add-trigger:hover {
  color: v-bind('token.colorText');
  background: v-bind('token.colorFillSecondary');
}

.quick-add-editor {
  padding: 10px;
  margin-top: 2px;
  background: v-bind('token.colorBgElevated');
  border-radius: 10px;
  box-shadow:
    0 0 0 1.5px v-bind('token.colorPrimaryBorder'),
    0 4px 12px 0 rgb(0 0 0 / 8%);
}

.quick-add-input {
  padding: 0;
}

.quick-add-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

/* 末尾添加列 */
.add-column-trigger {
  display: flex;
  flex: 0 0 296px;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  width: 296px;
  padding: 10px 12px;
  font-size: 13px;
  color: v-bind('token.colorTextTertiary');
  cursor: pointer;
  border: 1px dashed v-bind('token.colorBorderSecondary');
  border-radius: 14px;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.add-column-trigger:hover {
  color: v-bind('token.colorPrimary');
  background: v-bind('token.colorFillAlter');
  border-color: v-bind('token.colorPrimaryBorder');
}

.add-column-editor {
  flex: 0 0 296px;
  align-self: flex-start;
  width: 296px;
  padding: 10px;
  background: v-bind('token.colorFillAlter');
  border-radius: 14px;
}

/* 编辑列弹窗 */
.edit-column-section {
  margin-bottom: 16px;
}

.edit-column-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: v-bind('token.colorTextSecondary');
}

.color-presets {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-preset {
  width: 26px;
  height: 26px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.color-preset:hover {
  transform: scale(1.1);
}

.color-preset.active {
  border-color: v-bind('token.colorPrimary');
}
</style>

<!-- 拖拽手感：fallback 元素挂载在 body，scoped 样式不生效，用全局类 -->
<style>
.todo-task-ghost {
  background: rgb(128 128 128 / 10%) !important;
  border: 1.5px dashed rgb(128 128 128 / 45%) !important;
  border-radius: 10px !important;
  box-shadow: none !important;
  opacity: 1 !important;
}

.todo-task-ghost * {
  visibility: hidden;
}

.todo-task-drag {
  background: var(--ant-color-bg-elevated, #fff);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 18%) !important;
  opacity: 0.96;
  transform: rotate(2.5deg);
}

.todo-column-ghost {
  background: rgb(128 128 128 / 8%) !important;
  border: 1.5px dashed rgb(128 128 128 / 45%) !important;
  border-radius: 14px !important;
  opacity: 1 !important;
}

.todo-column-ghost * {
  visibility: hidden;
}

.todo-column-drag {
  border-radius: 14px;
  box-shadow: 0 16px 40px rgb(0 0 0 / 20%) !important;
  opacity: 0.96;
  transform: rotate(1.5deg);
}

.todo-detail-ghost {
  background: rgb(128 128 128 / 10%) !important;
  border-radius: 8px !important;
}

.todo-detail-ghost * {
  visibility: hidden;
}

.todo-detail-drag {
  background: var(--ant-color-bg-elevated, #fff);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 15%) !important;
  opacity: 0.96;
}
</style>
