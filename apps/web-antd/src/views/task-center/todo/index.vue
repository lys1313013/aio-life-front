<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import {
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

const getColumnStyle = (column: any) => {
  const bg = column.bgColor || token.value.colorFillAlter;
  return {
    bg,
  };
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

const formatDate = (date: any) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD HH:mm');
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
  bgColor: '#fff',
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
        <template #item="{ element: column }">
          <div
            class="kanban-column"
            :style="{ backgroundColor: getColumnStyle(column).bg }"
          >
            <div class="column-header">
              <div class="header-left">
                <span
                  class="column-title-tag"
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
    </template>

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

    <!-- 编辑任务模态框 -->
    <AModal
      v-model:open="editModalVisible"
      :title="null"
      width="1000px"
      centered
      :body-style="{
        minHeight: '400px',
        maxHeight: '75vh',
        overflowY: 'auto',
      }"
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
                <AButton
                  type="text"
                  size="small"
                  class="subtask-star-btn"
                  @click="handleStar(detail)"
                >
                  <template #icon>
                    <StarOutlined
                      :style="{
                        color: detail.isStarred === 1 ? '#faad14' : '#d9d9d9',
                      }"
                    />
                  </template>
                </AButton>
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

    <AModal
      v-model:open="editColumnModalVisible"
      :title="null"
      centered
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
  display: flex;
  flex: 0 0 300px;
  flex-direction: column;
  min-width: 300px;
  max-width: 300px;
  padding: 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
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
  font-size: 15px;
  font-weight: 600;
  color: v-bind('token.colorText');
  cursor: pointer;
  transition: opacity 0.2s;
}

.column-title-tag:hover {
  opacity: 0.8;
}

.task-count {
  min-width: 20px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  color: v-bind('token.colorTextSecondary');
  text-align: center;
  background: v-bind('token.colorFillSecondary');
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

.kanban-task {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  background: v-bind('token.colorBgElevated');
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 3%);
  transition: all 0.2s ease;
}

.kanban-task:hover {
  border-color: v-bind('token.colorPrimary');
  box-shadow: 0 4px 12px 0 rgb(0 0 0 / 8%);
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
  margin-top: 4px;
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

.due-date {
  font-size: 12px;
  color: v-bind('token.colorTextDescription');
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
  font-size: 16px;
  color: v-bind('token.colorTextSecondary');
  border-radius: 8px;
}

.simple-add-btn:hover {
  color: v-bind('token.colorText');
  background: v-bind('token.colorFillTertiary');
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
  padding-right: 4px;
}

.subtask-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  border-radius: 6px;
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
  position: absolute;
  right: 30px;
  bottom: 30px;
  z-index: 99;
}

.floating-button {
  width: 48px;
  height: 48px;
  font-size: 20px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-button:hover {
  box-shadow: 0 6px 20px rgb(0 0 0 / 20%);
  transform: scale(1.08) translateY(-2px);
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
  color: v-bind('token.colorTextSecondary');
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

.subtask-star-btn {
  margin-right: 8px;
}
</style>
