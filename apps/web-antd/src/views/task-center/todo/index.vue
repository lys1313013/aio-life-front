<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  MoreOutlined,
  PlusOutlined,
  StarOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Checkbox as ACheckbox,
  DatePicker as ADatePicker,
  Dropdown as ADropdown,
  Empty as AEmpty,
  Input as AInput,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Popover as APopover,
  Select as ASelect,
  SelectOption as ASelectOption,
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
  deleteColumn,
  deleteTask,
  deleteTaskDetail,
  getTaskColumnList,
  getTaskDetail,
  getTaskList,
  reSortColumn,
  reSortTask,
  reSortTaskDetail,
  saveColumn,
  saveTask,
  starTaskDetail,
  unstarTaskDetail,
  updateColumn,
  updateTask,
  updateTaskDetail,
} from '#/api/core/todo';

interface Detail {
  id: string;
  taskId: string;
  content: string;
  isCompleted: number;
  priority: number; // 1: very important, 10: important, 20: normal
  startTime?: any;
  endTime?: any;
}

interface Task {
  id: string;
  content: string;
  detail?: string;
  details?: Detail[];
  unCompletedCount?: number;
  startTime?: any;
  endTime?: any;
  dueDate?: any;
  createdAt?: any;
  columnId?: string;
}

const { useToken } = theme;
const { token } = useToken();

// 列强调色板（列未设置背景色时按序取色）
const accentPalette = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#eab308',
  '#ef4444',
];

const isBlankColor = (color?: string) => {
  if (!color) return true;
  const c = color.trim().toLowerCase();
  return ['', '#fff', '#ffffff', 'transparent', 'white'].includes(c);
};

const getColumnAccent = (column: any, index: number) => {
  if (!isBlankColor(column.bgColor)) return column.bgColor;
  return accentPalette[index % accentPalette.length];
};

const hexToRgba = (color: string, alpha: number) => {
  let h = (color || '').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return `rgba(59, 130, 246, ${alpha})`;
  const num = Number.parseInt(h, 16);
  if (Number.isNaN(num)) return `rgba(59, 130, 246, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
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

const columns = ref<
  Array<{
    bgColor?: string;
    id: string;
    tasks: Task[];
    title: string;
  }>
>([]);

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

const newColumnName = ref('');

const addTask = async (columnId: string) => {
  const column = columns.value.find((col) => col.id === columnId);
  if (column) {
    const hide = message.loading('添加中...', 0);
    try {
      const newTask: any = {
        content: '新任务',
        detail: '',
        columnId,
      };
      const savedTask = await saveTask(newTask);
      column.tasks.push(savedTask);
    } finally {
      hide();
    }
  }
};

const addColumn = async () => {
  if (!newColumnName.value.trim()) return;

  const hide = message.loading('添加中...', 0);
  try {
    const newColumn = {
      title: newColumnName.value,
      tasks: [],
    };

    const savedColumn = await saveColumn(newColumn);
    columns.value.push({ ...savedColumn, tasks: [] });
    newColumnName.value = '';
  } finally {
    hide();
  }
};

const onDragEnd = async (event: any) => {
  const toColumnId = event.to.dataset.columnId;
  const toColumn = columns.value.find((col) => col.id === toColumnId);
  if (!toColumn) return;

  const sortedTasks = toColumn.tasks.map((task, index) => ({
    id: task.id,
    columnId: toColumnId,
    sortOrder: index + 1,
  }));

  const hide = message.loading('更新排序中...', 0);
  try {
    await reSortTask(sortedTasks);
  } finally {
    hide();
  }
};

const onColumnDragEnd = async () => {
  const sortedData = columns.value.map((col, index) => ({
    id: col.id,
    sortOrder: index + 1,
  }));
  const hide = message.loading('更新排序中...', 0);
  try {
    await reSortColumn(sortedData);
  } finally {
    hide();
  }
};

const onDetailDragEnd = async () => {
  if (!editingTask.value.details) return;
  const sortedData = editingTask.value.details.map((detail, index) => ({
    id: detail.id,
    sort: index + 1,
  }));
  const hide = message.loading('更新排序中...', 0);
  try {
    await reSortTaskDetail(sortedData);
  } finally {
    hide();
  }
};

const editModalVisible = ref(false);
const editingTask = ref<Task>({
  id: '',
  content: '',
  detail: '',
  details: [],
  startTime: undefined,
  endTime: undefined,
  dueDate: undefined,
  createdAt: undefined,
});

const addDetailModalVisible = ref(false);
const newDetail = ref<any>({
  content: '',
  priority: 20,
  startTime: undefined,
  endTime: undefined,
  isStarred: 0,
});

const openEditModal = async (task: Task) => {
  const startTime = task.startTime ? dayjs(task.startTime) : undefined;
  const endTime = task.endTime ? dayjs(task.endTime) : undefined;
  const dueDate = task.dueDate ? dayjs(task.dueDate) : undefined;

  editingTask.value = {
    ...task,
    details: [],
    startTime,
    endTime,
    dueDate,
  };
  editModalVisible.value = true;

  const hide = message.loading('加载明细中...', 0);
  try {
    const details = await getTaskDetail(task.id);
    editingTask.value.details = details;
  } catch (error) {
    console.error('获取任务明细失败', error);
  } finally {
    hide();
  }
};

const addDetail = () => {
  newDetail.value = {
    content: '',
    priority: 20,
    timeRange: [],
    isStarred: 0,
  };
  addDetailModalVisible.value = true;
};

const handleToggleNewDetailStar = () => {
  newDetail.value.isStarred = newDetail.value.isStarred === 1 ? 0 : 1;
};

const handleAddDetailOk = async () => {
  if (!newDetail.value.content?.trim()) {
    return;
  }

  if (!editingTask.value.details) {
    editingTask.value.details = [];
  }

  const hide = message.loading('添加中...', 0);
  try {
    const [startTime, endTime] = newDetail.value.timeRange || [];
    const res = await addTaskDetail({
      ...newDetail.value,
      taskId: editingTask.value.id,
      isCompleted: 0,
      startTime: startTime
        ? startTime.format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      endTime: endTime ? endTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
    });
    editingTask.value.details.unshift(res);
    addDetailModalVisible.value = false;
  } catch (error) {
    console.error('添加明细失败', error);
  } finally {
    hide();
  }
};

const removeDetail = async (index: number, detail: Detail) => {
  const hide = message.loading('删除中...', 0);
  try {
    if (detail.id !== undefined && detail.id !== null) {
      await deleteTaskDetail(detail.id);
    }
    editingTask.value.details?.splice(index, 1);
  } catch (error) {
    console.error('删除明细失败', error);
  } finally {
    hide();
  }
};

const handleDetailCheck = async (detail: Detail, checked: boolean) => {
  detail.isCompleted = checked ? 1 : 0;
  const hide = message.loading('更新中...', 0);
  try {
    await updateTaskDetail(detail);
  } catch (error) {
    console.error('更新状态失败', error);
    detail.isCompleted = checked ? 0 : 1;
  } finally {
    hide();
  }
};

const handleDetailBlur = async (detail: Detail) => {
  if (!detail.content) return;
  try {
    await updateTaskDetail(detail);
  } catch (error) {
    console.error('更新内容失败', error);
  }
};

const handlePriorityChange = async (detail: Detail, priority: number) => {
  detail.priority = priority;
  await handleDetailBlur(detail);
};

// 优先级：高=红、中=橙、低=灰
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

const handleStar = async (detail: any) => {
  const hide = message.loading('更新中...', 0);
  try {
    if (detail.isStarred === 1) {
      detail.isStarred = 0;
      await unstarTaskDetail(detail.id);
    } else {
      detail.isStarred = 1;
      await starTaskDetail(detail.id);
    }
  } finally {
    hide();
  }
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

const handleEditCancel = () => {
  refreshTask(editingTask.value.id);
};

const handleEditOk = async () => {
  const column = columns.value.find((col) =>
    col.tasks.some((task) => task.id === editingTask.value.id),
  );

  if (column) {
    const taskIndex = column.tasks.findIndex(
      (task) => task.id === editingTask.value.id,
    );
    if (taskIndex !== -1) {
      column.tasks[taskIndex] = { ...editingTask.value };
    }
  }
  const hide = message.loading('保存中...', 0);
  try {
    await updateTask(editingTask.value);
    await refreshTask(editingTask.value.id);
    editModalVisible.value = false;
  } finally {
    hide();
  }
};

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

const deleteTaskFunc = async (taskId: string) => {
  const hide = message.loading('删除中...', 0);
  try {
    await deleteTask({ id: taskId });
    columns.value.forEach((column) => {
      column.tasks = column.tasks.filter(
        (task: { id: string }) => task.id !== taskId,
      );
    });
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

const openEditColumnModal = (column: any) => {
  editingColumn.value = { ...column };
  editColumnModalVisible.value = true;
};

const handleEditColumnOk = async () => {
  const column = columns.value.find((col) => col.id === editingColumn.value.id);
  if (column) {
    column.title = editingColumn.value.title;
    column.bgColor = editingColumn.value.bgColor;
    const hide = message.loading('保存中...', 0);
    try {
      await updateColumn(column);
      editColumnModalVisible.value = false;
    } finally {
      hide();
    }
  }
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
        @end="onColumnDragEnd"
        item-key="id"
        class="columns-container"
        handle=".column-header"
      >
        <template #item="{ element: column, index }">
          <div
            class="kanban-column"
            :style="{
              backgroundColor: isBlankColor(column.bgColor)
                ? token.colorFillAlter
                : column.bgColor,
            }"
          >
            <div
              class="column-accent-bar"
              :style="{
                background: `linear-gradient(90deg, ${getColumnAccent(column, index)}, ${hexToRgba(getColumnAccent(column, index), 0.25)})`,
              }"
            ></div>

            <div class="column-header">
              <div class="header-left">
                <span
                  class="column-dot"
                  :style="{
                    backgroundColor: getColumnAccent(column, index),
                    boxShadow: `0 0 0 3px ${hexToRgba(getColumnAccent(column, index), 0.18)}`,
                  }"
                ></span>
                <span
                  class="column-title-tag"
                  @click="openEditColumnModal(column)"
                >
                  {{ column.title }}
                </span>
                <span
                  class="task-count"
                  :style="{
                    color: getColumnAccent(column, index),
                    backgroundColor: hexToRgba(
                      getColumnAccent(column, index),
                      0.14,
                    ),
                  }"
                >
                  {{ column.tasks.length }}
                </span>
              </div>

              <ADropdown :trigger="['click']">
                <AButton type="text" size="small" class="more-btn">
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
              @end="onDragEnd"
              item-key="id"
              :data-column-id="column.id"
              class="task-list"
            >
              <template #item="{ element }">
                <div
                  class="kanban-task"
                  :data-task-id="element.id"
                  @click="openEditModal(element)"
                >
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

                  <div class="task-meta" v-if="element.detail">
                    <div class="task-detail-text">
                      {{
                        element.detail.length > 50
                          ? `${element.detail.substring(0, 50)}...`
                          : element.detail
                      }}
                    </div>
                  </div>

                  <div class="task-footer">
                    <div class="footer-left">
                      <span
                        v-if="element.unCompletedCount === 0"
                        class="done-badge"
                      >
                        <CheckCircleOutlined />
                        全部完成
                      </span>
                      <template v-else>
                        <ClockCircleOutlined class="prop-icon" />
                        <span class="uncompleted-count">
                          待办 {{ element.unCompletedCount ?? 0 }}
                        </span>
                      </template>
                    </div>
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
                <div class="add-task-wrapper" @click="addTask(column.id)">
                  <PlusOutlined class="add-task-icon" />
                  <span>添加任务</span>
                </div>
              </template>
            </draggable>
          </div>
        </template>
      </draggable>
    </template>

    <div class="floating-add-column">
      <APopover placement="topRight" trigger="click" :auto-focus="false">
        <template #content>
          <AInput
            v-model:value="newColumnName"
            placeholder="新列名称"
            @click.stop
            @press-enter="addColumn"
          />
          <AButton
            type="primary"
            @click="addColumn"
            style="width: 100%; margin-top: 10px"
          >
            添加列
          </AButton>
        </template>
        <AButton type="primary" shape="circle" class="floating-button">
          <template #icon><PlusOutlined /></template>
        </AButton>
      </APopover>
    </div>

    <!-- 编辑任务模态框 -->
    <AModal
      v-model:open="editModalVisible"
      :title="null"
      width="960px"
      centered
      :body-style="{
        minHeight: '400px',
        maxHeight: '75vh',
        overflowY: 'auto',
      }"
      @ok="handleEditOk"
      @cancel="handleEditCancel"
    >
      <!-- 标题区 -->
      <div class="modal-section">
        <div class="section-label">标题</div>
        <AInput
          v-model:value="editingTask.content"
          placeholder="任务标题"
          size="large"
          class="task-title-input"
        />
      </div>

      <!-- 时间区 -->
      <div class="modal-section">
        <div class="section-label">时间</div>
        <div class="task-dates-row">
          <div class="date-col">
            <div class="date-label">开始时间</div>
            <ADatePicker
              show-time
              v-model:value="editingTask.startTime"
              placeholder="开始时间"
              style="width: 100%"
            />
          </div>
          <div class="date-col">
            <div class="date-label">结束时间</div>
            <ADatePicker
              show-time
              v-model:value="editingTask.endTime"
              placeholder="结束时间"
              style="width: 100%"
            />
          </div>
          <div class="date-col">
            <div class="date-label">目标完成时间</div>
            <ADatePicker
              show-time
              v-model:value="editingTask.dueDate"
              placeholder="目标完成时间"
              style="width: 100%"
            />
          </div>
        </div>
      </div>

      <!-- 备注区 -->
      <div class="modal-section">
        <div class="section-label">备注</div>
        <ATextarea
          v-model:value="editingTask.detail"
          placeholder="任务备注"
          :rows="3"
        />
      </div>

      <!-- 明细区 -->
      <div class="modal-section subtasks-section">
        <div class="subtasks-header">
          <div class="section-label" style="margin-bottom: 0">
            明细
            <span class="subtasks-count">
              {{ editingTask.details?.length || 0 }}
            </span>
          </div>
          <AButton type="link" size="small" @click="addDetail">
            <template #icon><PlusOutlined /></template>
            添加
          </AButton>
        </div>

        <draggable
          v-if="editingTask.details && editingTask.details.length > 0"
          v-model="editingTask.details"
          item-key="id"
          handle=".drag-handle"
          class="subtasks-list"
          ghost-class="sortable-ghost"
          @end="onDetailDragEnd"
        >
          <template #item="{ element: detail, index }">
            <div class="subtask-item">
              <HolderOutlined class="drag-handle" />
              <ACheckbox
                :checked="detail.isCompleted === 1"
                @update:checked="(val) => handleDetailCheck(detail, val)"
                class="subtask-checkbox"
              />
              <AInput
                v-model:value="detail.content"
                :bordered="false"
                placeholder="输入任务内容..."
                class="subtask-input"
                :class="[{ 'subtask-completed': detail.isCompleted === 1 }]"
                @blur="handleDetailBlur(detail)"
              />
              <div class="subtask-actions">
                <AButton
                  type="text"
                  size="small"
                  class="subtask-star-btn"
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
                        ({ key }) => handlePriorityChange(detail, Number(key))
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
                <ADatePicker
                  show-time
                  size="small"
                  v-model:value="detail.startTime"
                  placeholder="开始"
                  class="subtask-date"
                  :bordered="false"
                  @change="handleDetailBlur(detail)"
                />
                <ADatePicker
                  show-time
                  size="small"
                  v-model:value="detail.endTime"
                  placeholder="结束"
                  class="subtask-date"
                  :bordered="false"
                  @change="handleDetailBlur(detail)"
                />
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
                    class="subtask-delete-btn"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </AButton>
                </APopconfirm>
              </div>
            </div>
          </template>
        </draggable>
        <div v-else class="subtasks-empty">
          <AEmpty
            :image="AEmpty.PRESENTED_IMAGE_SIMPLE"
            description="暂无明细"
          />
        </div>
      </div>
    </AModal>

    <!-- 添加明细模态框 -->
    <AModal
      v-model:open="addDetailModalVisible"
      :closable="false"
      :footer="null"
      centered
      class="todo-add-detail-modal"
    >
      <div class="relative pt-2">
        <div class="absolute right-0 top-0 z-10">
          <button
            type="button"
            @click="handleToggleNewDetailStar"
            :title="newDetail.isStarred === 1 ? '取消关注' : '添加关注'"
            class="flex h-auto cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none transition-transform hover:scale-110"
          >
            <VbenIcon
              v-if="newDetail.isStarred === 1"
              icon="mdi:star"
              class="text-[22px] text-yellow-500"
            />
            <VbenIcon
              v-else
              icon="mdi:star-outline"
              class="text-[22px] text-muted-foreground"
            />
          </button>
        </div>
        <div class="mt-4 space-y-4">
          <div class="space-y-2">
            <div class="text-sm">内容</div>
            <ATextarea
              v-model:value="newDetail.content"
              :auto-size="{ minRows: 1, maxRows: 4 }"
              placeholder="请输入明细内容"
            />
          </div>
          <div class="space-y-2">
            <div class="text-sm">优先级</div>
            <ASelect v-model:value="newDetail.priority" class="w-full">
              <ASelectOption :value="1">高</ASelectOption>
              <ASelectOption :value="10">中</ASelectOption>
              <ASelectOption :value="20">低</ASelectOption>
            </ASelect>
          </div>
          <div class="space-y-2">
            <div class="text-sm">起止时间</div>
            <ADatePicker.RangePicker
              show-time
              v-model:value="newDetail.timeRange"
              class="w-full"
            />
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <AButton @click="addDetailModalVisible = false">取消</AButton>
            <AButton type="primary" @click="handleAddDetailOk">确定</AButton>
          </div>
        </div>
      </div>
    </AModal>

    <!-- 编辑列模态框 -->
    <AModal
      v-model:open="editColumnModalVisible"
      :title="null"
      centered
      @ok="handleEditColumnOk"
    >
      <div class="modal-section" style="margin-top: 8px">
        <div class="section-label">列名称</div>
        <AInput v-model:value="editingColumn.title" placeholder="列名称" />
      </div>
      <div class="modal-section">
        <div class="section-label">背景颜色</div>
        <div class="column-color-row">
          <span
            class="color-preview"
            :style="{
              backgroundColor: isBlankColor(editingColumn.bgColor)
                ? token.colorFillAlter
                : editingColumn.bgColor,
            }"
          ></span>
          <AInput
            v-model:value="editingColumn.bgColor"
            placeholder="输入颜色代码，如 #e8f4ff"
            style="flex: 1"
          />
        </div>
      </div>
    </AModal>
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  /* Task Edit Modal Responsive */
  .task-dates-row {
    flex-direction: column;
    gap: 12px;
  }

  .subtask-item {
    position: relative;
    flex-wrap: wrap;
  }

  .subtask-checkbox {
    margin-right: 8px;
  }

  .subtask-input {
    flex: 1 1 calc(100% - 60px); /* Take remaining width in top row */
    min-width: 150px;
    margin: 0 0 4px;
  }

  .subtask-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding-left: 26px; /* Align with input start */
  }

  .subtask-date {
    width: 130px; /* Give it a fixed small width on mobile instead of flex */
    margin-right: 0;
  }

  .priority-tag {
    margin-right: 0;
  }

  .subtask-delete-btn {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .drag-handle {
    opacity: 1; /* Always show handle on mobile */
  }
}

.kanban-board {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  padding: 20px;
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

/* 自定义横向滚动条样式 */
.kanban-board::-webkit-scrollbar {
  height: 8px;
}

.kanban-board::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: v-bind('token.colorFillSecondary');
  border-radius: 4px;
  transition: background 0.2s ease;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: v-bind('token.colorFill');
}

.columns-container {
  display: flex;
  gap: 16px;
  width: max-content;
  min-width: 100%;
  height: 100%;
  padding: 0 0 20px;
}

.kanban-column {
  position: relative;
  display: flex;
  flex: 0 0 300px;
  flex-direction: column;
  min-width: 300px;
  max-width: 300px;
  padding: 0 12px 12px;
  overflow: hidden;
  border-radius: 12px;
  transition: all 0.3s ease;
}

/* 列顶部强调色条 */
.column-accent-bar {
  flex-shrink: 0;
  height: 4px;
  margin: 0 -12px 10px;
  border-radius: 0 0 4px 4px;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 4px;
  margin-bottom: 10px;
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

/* 列彩色圆点标识 */
.column-dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.column-title-tag {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  color: v-bind('token.colorText');
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.2s;
}

.column-title-tag:hover {
  opacity: 0.75;
}

/* 任务数徽章 */
.task-count {
  min-width: 22px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  border-radius: 10px;
}

.more-btn {
  color: v-bind('token.colorTextSecondary');
}

.task-list {
  flex: 1;
  min-height: 50px;
  padding: 2px;
  overflow-y: auto;
}

/* Custom vertical scrollbar for task list */
.task-list::-webkit-scrollbar {
  width: 4px;
}

.task-list::-webkit-scrollbar-thumb {
  background: v-bind('token.colorFillSecondary');
  border-radius: 2px;
}

/* 任务卡片 */
.kanban-task {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  background: v-bind('token.colorBgElevated');
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 10px;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 4%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.kanban-task:hover {
  border-color: v-bind('token.colorPrimaryBorder');
  box-shadow: 0 8px 20px 0 rgb(0 0 0 / 12%);
  transform: translateY(-2px);
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
  letter-spacing: -0.01em;
  word-break: break-word;
}

.delete-task-btn {
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.kanban-task:hover .delete-task-btn {
  opacity: 1;
}

.task-meta {
  margin-bottom: 2px;
}

.task-detail-text {
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: v-bind('token.colorTextSecondary');
  word-break: break-all;
  background: v-bind('token.colorFillQuaternary');
  border-radius: 6px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 2px;
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
  border-top: 1px dashed v-bind('token.colorBorderSecondary');
}

.footer-left {
  display: flex;
  gap: 6px;
  align-items: center;
}

.footer-left .prop-icon {
  font-size: 13px;
}

/* 全部完成标识 */
.done-badge {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  color: v-bind('token.colorSuccess');
  background: v-bind('token.colorSuccessBg');
  border: 1px solid v-bind('token.colorSuccessBorder');
  border-radius: 10px;
}

/* 截止日期徽章 */
.due-badge {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  margin-inline-end: 0;
  font-size: 11px;
  border-radius: 10px;
}

/* 列末尾内联添加任务卡片 */
.add-task-wrapper {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 9px 0;
  margin-top: 2px;
  font-size: 13px;
  color: v-bind('token.colorTextSecondary');
  cursor: pointer;
  border: 1px dashed v-bind('token.colorBorder');
  border-radius: 10px;
  transition: all 0.2s ease;
}

.add-task-wrapper:hover {
  color: v-bind('token.colorPrimary');
  background: v-bind('token.colorPrimaryBg');
  border-color: v-bind('token.colorPrimaryBorder');
}

.add-task-icon {
  font-size: 13px;
}

/* --- 编辑弹窗分区块 --- */
.modal-section {
  margin-bottom: 22px;
}

.modal-section:last-child {
  margin-bottom: 4px;
}

.section-label {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: v-bind('token.colorTextSecondary');
}

.section-label::before {
  width: 3px;
  height: 12px;
  content: '';
  background: v-bind('token.colorPrimary');
  border-radius: 2px;
}

.task-title-input {
  font-weight: 500;
}

.task-dates-row {
  display: flex;
  gap: 12px;
}

.date-col {
  flex: 1;
}

.date-label {
  margin-bottom: 6px;
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
}

.subtasks-section {
  margin-top: 4px;
}

.subtasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.subtasks-count {
  padding: 0 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: v-bind('token.colorPrimary');
  background: v-bind('token.colorPrimaryBg');
  border-radius: 9px;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

/* 明细卡片式行 */
.subtask-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background: v-bind('token.colorFillQuaternary');
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 10px;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.subtask-item:hover {
  background: v-bind('token.colorFillTertiary');
  border-color: v-bind('token.colorBorder');
}

.subtask-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle {
  margin-right: 8px;
  color: v-bind('token.colorTextQuaternary');
  cursor: grab;
  opacity: 0;
  transition: opacity 0.2s;
}

.drag-handle:active {
  cursor: grabbing;
}

.sortable-ghost {
  background: v-bind('token.colorFillSecondary');
  opacity: 0.5;
}

.subtask-input {
  flex: 1;
  margin: 0 8px;
}

.subtask-completed {
  color: v-bind('token.colorTextQuaternary');
  text-decoration: line-through;
}

.subtask-actions {
  display: flex;
  align-items: center;
}

.priority-tag {
  margin-right: 8px;
  cursor: pointer;
  border-radius: 10px;
  user-select: none;
}

.priority-option-tag {
  width: 100%;
  margin-right: 0;
  text-align: center;
  border-radius: 8px;
}

.subtask-date {
  width: 140px;
  margin-right: 4px;
}

.subtask-star-btn {
  margin-right: 4px;
}

.subtasks-empty {
  padding: 8px 0;
}

/* 浮动添加列按钮 */
.floating-add-column {
  position: absolute;
  right: 30px;
  bottom: 30px;
  z-index: 99;
}

.floating-button {
  width: 48px;
  height: 48px;
  font-size: 20px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-button:hover {
  box-shadow: 0 6px 20px rgb(0 0 0 / 25%);
  transform: scale(1.08) translateY(-2px);
}

/* 编辑列弹窗 */
.column-color-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.color-preview {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 8px;
}
</style>
