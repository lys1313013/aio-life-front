<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Checkbox as ACheckbox,
  DatePicker as ADatePicker,
  Dropdown as ADropdown,
  Input as AInput,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Popover as APopover,
  Select as ASelect,
  SelectOption as ASelectOption,
  Tag as ATag,
  Textarea as ATextarea,
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
  updateColumn,
  updateTask,
  updateTaskDetail,
} from '#/api/core/todo';

interface Detail {
  id: number;
  taskId: number;
  content: string;
  isCompleted: number;
  priority: number; // 1: very important, 10: important, 20: normal
  startTime?: any;
  endTime?: any;
}

interface Task {
  id: number;
  content: string;
  detail?: string;
  details?: Detail[];
  unCompletedCount?: number;
  startTime?: any;
  endTime?: any;
  dueDate?: any;
  createdAt?: any;
  columnId?: number;
}

const { useToken } = theme;
const { token } = useToken();

// 预定义列主题颜色（仿照设计图）
const columnThemes = [
  {
    bg: '#eff3f9',
    headerBg: '#dae5f5',
    headerColor: '#5285c5',
    label: '未开始',
  }, // 蓝
  {
    bg: '#fff9e6',
    headerBg: '#fff2cc',
    headerColor: '#d4a017',
    label: '修复中',
  }, // 黄
  {
    bg: '#f0f0ff',
    headerBg: '#e6e6ff',
    headerColor: '#6c5ce7',
    label: '验证中',
  }, // 紫
  {
    bg: '#eff9ef',
    headerBg: '#dcf0dc',
    headerColor: '#4b9e4b',
    label: '已完成',
  }, // 绿
];

// 获取列样式的辅助函数
const getColumnStyle = (column: any, index: number) => {
  const themeIndex = index % columnThemes.length;
  const currentTheme = columnThemes[themeIndex] ||
    columnThemes[0] || {
      bg: '#eff3f9',
      headerBg: '#dae5f5',
      headerColor: '#5285c5',
    };

  // 优先使用列自身配置的 bgColor
  const bg = column.bgColor || currentTheme.bg;

  // 如果是自定义背景色，标题标签使用半透明遮罩以适应各种背景，否则使用主题配套颜色
  const headerBg = column.bgColor
    ? 'rgba(0, 0, 0, 0.06)'
    : currentTheme.headerBg;
  const headerColor = column.bgColor
    ? 'rgba(0, 0, 0, 0.65)'
    : currentTheme.headerColor;

  return {
    bg,
    headerBg,
    headerColor,
  };
};

const columns = ref<
  Array<{
    bgColor?: string;
    id: number;
    tasks: Task[];
    title: string;
  }>
>([]);

onMounted(async () => {
  // 初始化列
  const res = await getTaskColumnList({});
  console.log('getTaskColumnList', res);
  columns.value = res.items.map((item: any) => ({
    ...item,
    tasks: item.tasks || [],
  }));

  getTaskList({}).then((res) => {
    console.log('getTaskList', res);
    columns.value.forEach((column) => {
      column.tasks = res.items.filter(
        (item: { columnId: number }) => item.columnId === column.id,
      );
    });
  });
});

const newColumnName = ref('');

const addTask = async (columnId: number) => {
  const column = columns.value.find((col) => col.id === columnId);
  if (column) {
    const newTask: Task = {
      id: 0,
      content: '新任务',
      detail: '',
      createdAt: new Date(),
      columnId,
    };
    const savedTask = await saveTask(newTask);
    column.tasks.push(savedTask);
  }
};

// 添加列
const addColumn = async () => {
  if (!newColumnName.value.trim()) return;

  // 生成一个随机id
  const newColumnId = Math.floor(Math.random() * 1_000_000);
  let newColumn = {
    id: newColumnId,
    title: newColumnName.value,
    tasks: [],
  };

  columns.value.push(newColumn);
  newColumn = await saveColumn(newColumn);

  newColumnName.value = '';
};

const onDragEnd = (event: any) => {
  console.log('完整拖拽事件:', event);
  const fromColumnId = Number(event.from.dataset.columnId);
  const toColumnId = Number(event.to.dataset.columnId);
  const taskId = Number(event.item.dataset.taskId);

  console.log('移动前列ID:', fromColumnId);
  console.log('移动后列ID:', toColumnId);
  console.log('移动的任务ID:', taskId);
  console.log('原始位置:', event.oldIndex);
  console.log('新位置:', event.newIndex);

  // 获取目标列
  const toColumn = columns.value.find((col) => col.id === toColumnId);
  if (!toColumn) return;

  // 准备重排序数据
  const sortedTasks = toColumn.tasks.map((task, index) => ({
    id: task.id,
    columnId: toColumnId,
    sortOrder: index + 1,
  }));
  console.log('排序后的数据:', sortedTasks);

  // 调用API更新排序
  reSortTask(sortedTasks);
};

const onColumnDragEnd = (event: any) => {
  console.log('列已移动', event);
  // 只传输id和sortOrder
  const sortedData = columns.value.map((col, index) => ({
    id: col.id,
    sortOrder: index + 1,
  }));
  reSortColumn(sortedData);
};

const onDetailDragEnd = () => {
  if (!editingTask.value.details) return;
  const sortedData = editingTask.value.details.map((detail, index) => ({
    id: detail.id,
    sort: index + 1,
  }));
  reSortTaskDetail(sortedData);
};

const formatDate = (date: any) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const editModalVisible = ref(false);
const editingTask = ref<Task>({
  id: 0,
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
});

// 打开编辑模态框
const openEditModal = async (task: Task) => {
  const startTime = task.startTime ? dayjs(task.startTime) : undefined;
  const endTime = task.endTime ? dayjs(task.endTime) : undefined;
  const dueDate = task.dueDate ? dayjs(task.dueDate) : undefined;

  editingTask.value = {
    ...task,
    details: [], // 先清空，等待加载
    startTime,
    endTime,
    dueDate,
  };
  editModalVisible.value = true;

  try {
    const details = await getTaskDetail(task.id);
    editingTask.value.details = details;
  } catch (error) {
    console.error('获取任务明细失败', error);
  }
};

const addDetail = () => {
  newDetail.value = {
    content: '',
    priority: 20,
    startTime: undefined,
    endTime: undefined,
  };
  addDetailModalVisible.value = true;
};

const handleAddDetailOk = async () => {
  if (!newDetail.value.content?.trim()) {
    return;
  }

  if (!editingTask.value.details) {
    editingTask.value.details = [];
  }

  try {
    const res = await addTaskDetail({
      ...newDetail.value,
      taskId: editingTask.value.id,
      isCompleted: 0,
    });
    // Add to the beginning of the list to solve the "find it at the bottom" issue
    editingTask.value.details.unshift(res);
    addDetailModalVisible.value = false;
  } catch (error) {
    console.error('添加明细失败', error);
  }
};

const removeDetail = async (index: number, detail: Detail) => {
  try {
    if (detail.id !== undefined && detail.id !== null) {
      await deleteTaskDetail(detail.id);
    }
    editingTask.value.details?.splice(index, 1);
  } catch (error) {
    console.error('删除明细失败', error);
  }
};

const handleDetailCheck = async (detail: Detail, checked: boolean) => {
  detail.isCompleted = checked ? 1 : 0;
  try {
    await updateTaskDetail(detail);
  } catch (error) {
    console.error('更新状态失败', error);
    // 回滚状态
    detail.isCompleted = checked ? 0 : 1;
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

const getPriorityColor = (priority: number) => {
  if (priority === 1) return 'error';
  if (priority === 10) return 'warning';
  return 'default';
};

const getPriorityLabel = (priority: number) => {
  if (priority === 1) return '高';
  if (priority === 10) return '中';
  return '低';
};

const refreshTask = async (taskId: number) => {
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

// 编辑任务
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
  await updateTask(editingTask.value);
  await refreshTask(editingTask.value.id);
  editModalVisible.value = false;
};

const confirmDeleteColumn = (columnId: number) => {
  Modal.confirm({
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

const deleteColumnMethod = (columnId: number) => {
  deleteColumn({ id: columnId });
  columns.value = columns.value.filter((col) => col.id !== columnId);
};

const deleteTaskFunc = async (taskId: number) => {
  await deleteTask({ id: taskId });
  columns.value.forEach((column) => {
    column.tasks = column.tasks.filter(
      (task: { id: number }) => task.id !== taskId,
    );
  });
};

const editColumnModalVisible = ref(false);
const editingColumn = ref({
  id: null,
  title: '',
  bgColor: '#fff',
});

const openEditColumnModal = (
  column:
    | { bgColor: string; id: null; title: string }
    | { bgColor: string; id: null; title: string },
) => {
  editingColumn.value = { ...column };
  editColumnModalVisible.value = true;
};

const handleEditColumnOk = async () => {
  const column = columns.value.find((col) => col.id === editingColumn.value.id);
  if (column) {
    column.title = editingColumn.value.title;
    column.bgColor = editingColumn.value.bgColor;
    await updateColumn(column);
  }
  editColumnModalVisible.value = false;
};
</script>

<template>
  <div class="kanban-board">
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
          :style="{ backgroundColor: getColumnStyle(column, index).bg }"
        >
          <div class="column-header">
            <div class="header-left">
              <span
                class="column-title-tag"
                :style="{
                  backgroundColor: getColumnStyle(column, index).headerBg,
                  color: getColumnStyle(column, index).headerColor,
                }"
                @click="openEditColumnModal(column)"
              >
                {{ column.title }}
              </span>
              <span class="task-count">{{ column.tasks.length }}</span>
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
                    <ClockCircleOutlined class="prop-icon" />
                    <span class="uncompleted-count"
                      >待办: {{ element.unCompletedCount || 0 }}</span
                    >
                  </div>
                  <span class="due-date">{{
                    formatDate(element.dueDate)
                  }}</span>
                </div>
              </div>
            </template>
            <template #footer>
              <div class="add-task-wrapper">
                <AButton
                  type="text"
                  block
                  class="simple-add-btn"
                  @click="addTask(column.id)"
                >
                  <template #icon><PlusOutlined /></template>
                </AButton>
              </div>
            </template>
          </draggable>
        </div>
      </template>
    </draggable>

    <div class="floating-add-column">
      <APopover placement="topRight" trigger="click" :auto-focus="false">
        <template #content>
          <AInput
            v-model:value="newColumnName"
            placeholder="新列名称"
            @click.stop
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

    <AModal
      v-model:open="editModalVisible"
      title="编辑任务"
      width="1000px"
      :style="{ top: '20px' }"
      :body-style="{ height: 'calc(100vh - 150px)', overflowY: 'auto' }"
      @ok="handleEditOk"
      @cancel="handleEditCancel"
    >
      <AInput
        v-model:value="editingTask.content"
        placeholder="任务标题"
        size="large"
        :bordered="false"
        :style="{
          padding: '15px 0px',
        }"
      />

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

      <ATextarea
        v-model:value="editingTask.detail"
        placeholder="任务备注"
        :rows="3"
        style="margin-bottom: 20px"
      />

      <div class="subtasks-section">
        <div class="subtasks-header">
          <span class="subtasks-title">
            <CheckCircleOutlined style="margin-right: 8px" />
            任务明细
          </span>
          <AButton type="link" size="small" @click="addDetail">
            <template #icon><PlusOutlined /></template>
            添加
          </AButton>
        </div>

        <draggable
          v-if="editingTask.details"
          v-model="editingTask.details"
          item-key="id"
          handle=".drag-handle"
          class="subtasks-list"
          ghost-class="sortable-ghost"
          @end="onDetailDragEnd"
        >
          <template #item="{ element: detail, index }">
            <div class="subtask-item">
              <HolderOutlined
                class="drag-handle"
                style="margin-right: 8px; color: #999; cursor: move"
              />
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
                <ADropdown :trigger="['click']" placement="bottomRight">
                  <ATag
                    :color="getPriorityColor(detail.priority)"
                    style="
                      cursor: pointer;
                      user-select: none;
                      border-radius: 4px;
                    "
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
                      <AMenuItem key="20">
                        <ATag
                          color="default"
                          style="
                            width: 100%;
                            margin-right: 0;
                            text-align: center;
                          "
                        >
                          低
                        </ATag>
                      </AMenuItem>
                      <AMenuItem key="10">
                        <ATag
                          color="warning"
                          style="
                            width: 100%;
                            margin-right: 0;
                            text-align: center;
                          "
                        >
                          中
                        </ATag>
                      </AMenuItem>
                      <AMenuItem key="1">
                        <ATag
                          color="error"
                          style="
                            width: 100%;
                            margin-right: 0;
                            text-align: center;
                          "
                        >
                          高
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
      </div>
    </AModal>

    <!-- 添加任务明细弹窗 -->
    <AModal
      v-model:open="addDetailModalVisible"
      title="添加"
      @ok="handleAddDetailOk"
      @cancel="addDetailModalVisible = false"
    >
      <div
        style="
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 10px 0;
        "
      >
        <div>
          <div style="margin-bottom: 5px; font-size: 12px; color: #666">
            任务内容
          </div>
          <AInput
            v-model:value="newDetail.content"
            placeholder="输入任务内容..."
            auto-focus
          />
        </div>
        <div class="task-dates-row">
          <div class="date-col">
            <div class="date-label">优先级</div>
            <ASelect v-model:value="newDetail.priority" style="width: 100%">
              <ASelectOption :value="20" label="低">
                <ATag color="default" style="margin-right: 0"> 低 </ATag>
              </ASelectOption>
              <ASelectOption :value="10" label="中">
                <ATag color="warning" style="margin-right: 0"> 中 </ATag>
              </ASelectOption>
              <ASelectOption :value="1" label="高">
                <ATag color="error" style="margin-right: 0"> 高 </ATag>
              </ASelectOption>
            </ASelect>
          </div>
          <div class="date-col">
            <div class="date-label">开始时间</div>
            <ADatePicker
              show-time
              v-model:value="newDetail.startTime"
              placeholder="开始时间"
              style="width: 100%"
            />
          </div>
          <div class="date-col">
            <div class="date-label">结束时间</div>
            <ADatePicker
              show-time
              v-model:value="newDetail.endTime"
              placeholder="结束时间"
              style="width: 100%"
            />
          </div>
        </div>
      </div>
    </AModal>

    <AModal
      v-model:open="editColumnModalVisible"
      title="编辑"
      @ok="handleEditColumnOk"
    >
      <AInput
        v-model:value="editingColumn.title"
        placeholder="列名称"
        style="margin-bottom: 10px"
      />
      <div style="display: flex; align-items: center; margin-bottom: 10px">
        <span style="margin-right: 10px">背景颜色:</span>
        <AInput
          :style="{
            backgroundColor: editingColumn.bgColor || token.colorBgContainer,
            color: token.colorText,
          }"
          v-model:value="editingColumn.bgColor"
          placeholder="输入颜色代码"
          style="width: 120px; margin-right: 10px"
        />
      </div>
    </AModal>
  </div>
</template>

<style scoped>
@media (max-width: 768px) {
  /* Task Edit Modal Responsive */
  .task-dates-row {
    flex-direction: column;
    gap: 15px;
  }

  .subtask-item {
    position: relative;
    flex-wrap: wrap;
    padding: 8px;
    margin-bottom: 12px;
    background: v-bind('token.colorFillQuaternary');
    border-radius: 8px;
  }

  .subtask-checkbox {
    margin-right: 8px;
  }

  .subtask-input {
    flex: 1 1 calc(100% - 60px); /* Take remaining width in top row */
    min-width: 150px;
    margin: 0 0 8px;
  }

  .subtask-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding-left: 24px; /* Align with input start */
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
    top: 8px;
    right: 8px;
  }

  .drag-handle {
    opacity: 1; /* Always show handle on mobile */
  }
}

.kanban-board {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 40px);
  padding: 20px;
  overflow: auto hidden;
}

/* 自定义横向滚动条样式 */
.kanban-board::-webkit-scrollbar {
  height: 8px;
}

.kanban-board::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: rgb(0 0 0 / 10%);
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: rgb(0 0 0 / 20%);
}

.columns-container {
  display: flex;
  gap: 16px;
  width: max-content;
  min-width: 100%;
  height: 100%;
  padding: 10px 10px 20px; /* 底部留出滚动条空间 */
}

.kanban-column {
  display: flex;
  flex: 0 0 300px;
  flex-direction: column;
  min-width: 300px;
  max-width: 300px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px;
  margin-bottom: 12px;
  cursor: grab;
}

.column-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.column-title-tag {
  padding: 4px 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 20px;
  transition: all 0.3s;
}

.column-title-tag:hover {
  filter: brightness(0.9);
}

.task-count {
  min-width: 20px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: #8c8c8c;
  text-align: center;
  background: rgb(0 0 0 / 5%);
  border-radius: 10px;
}

.more-btn {
  color: #8c8c8c;
}

.task-list {
  flex: 1;
  min-height: 50px;
  padding: 4px;
  overflow-y: auto;
}

.kanban-task {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 5%);
  transition: all 0.2s;
}

.kanban-task:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.task-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #262626;
}

.delete-task-btn {
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.kanban-task:hover .delete-task-btn {
  opacity: 1;
}

.task-meta {
  margin-bottom: 4px;
}

.task-detail-text {
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #8c8c8c;
  word-break: break-all;
  background: #f8f9fa;
  border-radius: 6px;
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid #f0f0f0;
}

.footer-left {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: #8c8c8c;
}

.due-date {
  font-size: 11px;
  color: #bfbfbf;
}

.add-task-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.simple-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 18px;
  color: #bfbfbf;
}

.simple-add-btn:hover {
  color: #8c8c8c;
  background: rgb(0 0 0 / 2%);
}

/* 隐藏不必要的样式 */
.delete-column-btn {
  display: none;
}

.add-task-card {
  display: none;
}

.subtasks-section {
  margin-top: 10px;
}

.subtasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.subtasks-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: v-bind('token.colorText');
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* max-height: 500px; */

  /* Removed to allow modal body to scroll */

  /* overflow-y: auto; */
  padding-right: 4px;
}

.subtask-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  transition: background 0.3s;
}

.subtask-item:hover {
  background: v-bind('token.colorFillQuaternary');
}

.subtask-item:hover .drag-handle {
  opacity: 1;
}

.drag-handle {
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

.subtask-completed {
  color: v-bind('token.colorTextQuaternary');
  text-decoration: line-through;
}

.floating-add-column {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 1000;
}

.floating-button {
  width: 50px;
  height: 50px;
  font-size: 20px;
  box-shadow: 0 2px 10px rgb(0 0 0 / 20%);
}

.floating-button:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 30%);
  transform: scale(1.1);
}

/* --- Responsive Styles --- */
.task-dates-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.date-col {
  flex: 1;
}

.date-label {
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.subtask-input {
  flex: 1;
  margin: 0 8px;
}

.subtask-actions {
  display: flex;
  align-items: center;
}

.priority-tag {
  margin-right: 8px;
}

.subtask-date {
  width: 140px;
  margin-right: 4px;
}
</style>
