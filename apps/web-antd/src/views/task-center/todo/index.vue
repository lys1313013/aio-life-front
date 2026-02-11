<template>
  <div class="kanban-board">
    <draggable
      v-model="columns"
      group="columns"
      @end="onColumnDragEnd"
      item-key="id"
      class="columns-container"
    >
      <template #item="{ element: column, index }">
        <div class="kanban-column" :style="{ backgroundColor: token[getColumnStyle(index).bgToken as keyof typeof token] as string }">
          <div class="column-header">
            <div class="header-left">
              <span 
                class="column-title-tag"
                :style="{ 
                  backgroundColor: token[getColumnStyle(index).headerBgToken as keyof typeof token] as string,
                  color: token[getColumnStyle(index).headerColorToken as keyof typeof token] as string
                }"
                @click="openEditColumnModal(column)"
              >
                {{ column.title }}
              </span>
              <span class="task-count">{{ column.tasks.length }}</span>
            </div>
            
            <a-dropdown :trigger="['click']">
              <a-button type="text" size="small" class="more-btn">
                <template #icon><more-outlined /></template>
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="edit" @click="openEditColumnModal(column)">
                    <edit-outlined /> 编辑
                  </a-menu-item>
                  <a-menu-item key="delete" danger @click="confirmDeleteColumn(column.id)">
                    <delete-outlined /> 删除
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
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
              <div class="kanban-task" :data-task-id="element.id" @click="openEditModal(element)">
                <div class="task-header">
                  <span class="task-title">{{ element.content }}</span>
                </div>
                
                <div class="task-meta">
                  <div class="task-tags" v-if="element.detail">
                     <span class="project-tag" :title="element.detail">
                       {{ element.detail.length > 24 ? element.detail.substring(0, 24) + '...' : element.detail }}
                     </span>
                  </div>
                  
                  <div class="task-props">
                     <div class="prop-item">
                      <clock-circle-outlined class="prop-icon" />
                      <span>未完成任务数: {{ element.unCompletedCount || 0 }}</span>
                    </div>
                  </div>
                </div>

                <div class="task-footer">
                  <span class="due-date">{{ formatDate(element.dueDate) }}</span>
                  <a-popconfirm
                    title="确定要删除这个任务吗?"
                    ok-text="确定"
                    cancel-text="取消"
                    @click.stop
                    @confirm="deleteTaskFunc(element.id)"
                  >
                    <a-button
                      type="text"
                      size="small"
                      danger
                      class="delete-task-btn"
                    >
                      <template #icon><delete-outlined /></template>
                    </a-button>
                  </a-popconfirm>
                </div>
              </div>
            </template>
            <template #footer>
              <div class="add-task-wrapper">
                 <a-button type="text" block class="simple-add-btn" @click="addTask(column.id)">
                  <template #icon><plus-outlined /></template>
                </a-button>
              </div>
            </template>
          </draggable>
        </div>
      </template>
    </draggable>

    <div class="floating-add-column">
      <a-popover
        placement="topRight"
        trigger="click"
        :autoFocus="false"
      >
        <template #content>
          <a-input
            v-model:value="newColumnName"
            placeholder="新列名称"
            @click.stop
          />
          <a-button
            type="primary"
            @click="addColumn"
            style="margin-top: 10px; width: 100%"
          >
            添加列
          </a-button>
        </template>
        <a-button type="primary" shape="circle" class="floating-button">
          <template #icon><plus-outlined /></template>
        </a-button>
      </a-popover>
    </div>

    <a-modal
      v-model:open="editModalVisible"
      title="编辑任务"
      width="1000px"
      :style="{ top: '20px' }"
      :bodyStyle="{ height: 'calc(100vh - 150px)', overflowY: 'auto' }"
      @ok="handleEditOk"
      @cancel="handleEditCancel"
    >
      <a-input
        v-model:value="editingTask.content"
        placeholder="任务标题"
        size="large"
        :bordered="false"
        :style="{
          padding: '15px 0px',
        }"
      />

      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div style="flex: 1">
            <div style="margin-bottom: 5px; font-size: 12px; color: #666;">开始时间</div>
            <a-date-picker show-time v-model:value="editingTask.startTime" placeholder="开始时间" style="width: 100%" />
        </div>
        <div style="flex: 1">
            <div style="margin-bottom: 5px; font-size: 12px; color: #666;">结束时间</div>
            <a-date-picker show-time v-model:value="editingTask.endTime" placeholder="结束时间" style="width: 100%" />
        </div>
        <div style="flex: 1">
             <div style="margin-bottom: 5px; font-size: 12px; color: #666;">目标完成时间</div>
             <a-date-picker show-time v-model:value="editingTask.dueDate" placeholder="目标完成时间" style="width: 100%" />
        </div>
      </div>

      <a-textarea
        v-model:value="editingTask.detail"
        placeholder="任务备注"
        :rows="3"
        style="margin-bottom: 20px"
      />

      <div class="subtasks-section">
        <div class="subtasks-header">
          <span class="subtasks-title">
            <check-circle-outlined style="margin-right: 8px" />
            明细任务
          </span>
          <a-button type="link" size="small" @click="addDetail">
            <template #icon><plus-outlined /></template>
            添加
          </a-button>
        </div>
        
        <draggable
          v-if="editingTask.details"
          v-model="editingTask.details"
          item-key="id"
          handle=".drag-handle"
          class="subtasks-list"
          ghost-class="sortable-ghost"
        >
          <template #item="{ element: detail, index }">
            <div class="subtask-item">
              <holder-outlined class="drag-handle" style="cursor: move; margin-right: 8px; color: #999" />
              <a-checkbox 
                :checked="detail.isCompleted === 1" 
                @update:checked="(val) => handleDetailCheck(detail, val)"
              />
              <a-input 
                v-model:value="detail.content" 
                :bordered="false"
                placeholder="输入任务内容..."
                :class="{ 'subtask-completed': detail.isCompleted === 1 }"
                style="flex: 1; margin: 0 8px"
                @blur="handleDetailBlur(detail)"
              />
              <a-date-picker 
                show-time 
                size="small" 
                v-model:value="detail.startTime" 
                placeholder="开始" 
                style="width: 140px; margin-right: 4px;"
                :bordered="false"
                @change="handleDetailBlur(detail)"
              />
              <a-date-picker 
                show-time 
                size="small" 
                v-model:value="detail.endTime" 
                placeholder="结束" 
                style="width: 140px; margin-right: 4px;"
                :bordered="false"
                @change="handleDetailBlur(detail)"
              />
              <a-button type="text" danger size="small" @click="removeDetail(index, detail)">
                <template #icon><delete-outlined /></template>
              </a-button>
            </div>
          </template>
        </draggable>
      </div>
    </a-modal>
    <a-modal
      v-model:open="editColumnModalVisible"
      title="编辑"
      @ok="handleEditColumnOk"
    >
      <a-input
        v-model:value="editingColumn.title"
        placeholder="列名称"
        style="margin-bottom: 10px"
      />
      <div style="display: flex; align-items: center; margin-bottom: 10px">
        <span style="margin-right: 10px">背景颜色:</span>
        <a-input :style="{ backgroundColor: editingColumn.bgColor || token.colorBgContainer, color: token.colorText }"
          v-model:value="editingColumn.bgColor"
          placeholder="输入颜色代码"
          style="width: 120px; margin-right: 10px"
        />
      </div>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import draggable from 'vuedraggable';
import { Button as AButton, Input as AInput, Textarea as ATextarea, Modal as AModal, DatePicker as ADatePicker, Popconfirm as APopconfirm, Checkbox as ACheckbox, theme, Dropdown as ADropdown, Menu as AMenu, MenuItem as AMenuItem, Tag as ATag } from 'ant-design-vue';

import { getTaskColumnList, saveColumn, updateColumn, deleteColumn, reSortColumn} from '#/api/core/todo';

import { getTaskList, saveTask, updateTask, deleteTask, reSortTask, getTaskDetail, addTaskDetail, updateTaskDetail, deleteTaskDetail } from '#/api/core/todo';

import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, EditOutlined, MoreOutlined, CalendarOutlined, ClockCircleOutlined, UserOutlined, HolderOutlined } from '@ant-design/icons-vue';
import { Popover as APopover } from 'ant-design-vue';
import { Modal } from 'ant-design-vue';

interface Detail {
  id: number;
  taskId: number;
  content: string;
  isCompleted: number;
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
    { bg: 'colorFillQuaternary', headerBg: 'colorFillSecondary', headerColor: 'colorText', label: '待办' }, // 灰
    { bg: 'colorFillQuaternary', headerBg: 'colorPrimaryBg', headerColor: 'colorPrimary', label: '进行中' },   // 蓝
    { bg: 'colorFillQuaternary', headerBg: 'colorSuccessBg', headerColor: 'colorSuccess', label: '已完成' },   // 绿
    { bg: 'colorFillQuaternary', headerBg: 'colorErrorBg', headerColor: 'colorError', label: '阻塞' },       // 红
  ];

  // 获取列样式的辅助函数
  const getColumnStyle = (index: number) => {
    const themeIndex = index % columnThemes.length;
    const currentTheme = columnThemes[themeIndex] ?? columnThemes[0];
    // 使用 token 中的颜色值，确保支持夜间模式
    // 注意：这里需要动态构建 style 对象，因为 v-bind 在 script 中不能直接用，
    // 但我们可以利用 computed 或者直接在 template 中绑定 style
    if (!currentTheme) return { bgToken: 'colorFillQuaternary', headerBgToken: 'colorFillSecondary', headerColorToken: 'colorText' };
    return {
      bgToken: currentTheme.bg,
      headerBgToken: currentTheme.headerBg,
      headerColorToken: currentTheme.headerColor
    };
  };

const columns = ref<Array<{
  id: number;
  title: string;
  tasks: Task[];
  bgColor?: string;
}>>([]);

onMounted(async () => {
  // 初始化列
  const res = await getTaskColumnList({});
  console.log('getTaskColumnList', res);
  columns.value = res.items.map((item: any) => ({
    ...item,
    tasks: item.tasks || []
  }));

  getTaskList({}).then((res) => {
    console.log('getTaskList', res);
    columns.value.forEach((column) => {
      column.tasks = res.items.filter((item: { columnId: number; }) => item.columnId === column.id);
    })
  })
});


const newColumnName = ref('');

const addTask = async (columnId: number) => {
  const column = columns.value.find(col => col.id === columnId);
  if (column) {
    const newTask: Task = {
      id: 0,
      content: '新任务',
      detail: '',
      createdAt: new Date(),
      columnId: columnId
    };
    const savedTask = await saveTask(newTask);
    column.tasks.push(savedTask);
  }

};

// 添加列
const addColumn = async () => {
  if (!newColumnName.value.trim()) return;

  // 生成一个随机id
  const newColumnId = Math.floor(Math.random() * 1000000);
  let newColumn = {
    id: newColumnId,
    title: newColumnName.value,
    tasks: []
  }

  columns.value.push(newColumn);
  newColumn = await saveColumn(newColumn)

  newColumnName.value = '';
};

const onDragEnd = (event: any) => {
  console.log('完整拖拽事件:', event);
  const fromColumnId = Number(event.from.getAttribute('data-column-id'));
  const toColumnId = Number(event.to.getAttribute('data-column-id'));
  const taskId = Number(event.item.dataset.taskId);

  console.log('移动前列ID:', fromColumnId);
  console.log('移动后列ID:', toColumnId);
  console.log('移动的任务ID:', taskId);
  console.log('原始位置:', event.oldIndex);
  console.log('新位置:', event.newIndex);

  // 获取目标列
  const toColumn = columns.value.find(col => col.id === toColumnId);
  if (!toColumn) return;

  // 准备重排序数据
  const sortedTasks = toColumn.tasks.map((task, index) => ({
    id: task.id,
    columnId: toColumnId,
    sortOrder: index + 1
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

// 打开编辑模态框
const openEditModal = async (task: Task) => {
  const startTime = task.startTime ? dayjs(task.startTime) : undefined;
  const endTime = task.endTime ? dayjs(task.endTime) : undefined;
  const dueDate = task.dueDate ? dayjs(task.dueDate) : undefined;

  editingTask.value = {
    ...task,
    details: [], // 先清空，等待加载
    startTime: startTime,
    endTime: endTime,
    dueDate: dueDate,
  };
  editModalVisible.value = true;

  try {
    const details = await getTaskDetail(task.id);
    editingTask.value.details = details;
  } catch (error) {
    console.error('获取任务明细失败', error);
  }
};

const addDetail = async () => {
  if (!editingTask.value.details) {
    editingTask.value.details = [];
  }
  
  // 创建新明细
  try {
    const newDetail = {
      taskId: editingTask.value.id,
      content: '',
      isCompleted: 0,
    };
    const res = await addTaskDetail(newDetail);
    // 后端返回的res应该包含生成的id
    editingTask.value.details.push(res);
  } catch (error) {
    console.error('添加明细失败', error);
  }
};

const removeDetail = async (index: number, detail: Detail) => {
  try {
    if (typeof detail.id === 'number') {
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

const refreshTask = async (taskId: number) => {
  try {
    const res = await getTaskList({ taskId });
    if (res.items) {
      const task = res.items.find((t: any) => t.id === taskId);
      if (task) {
        columns.value.forEach(col => {
          const idx = col.tasks.findIndex(t => t.id === taskId);
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
  const column = columns.value.find(col =>
    col.tasks.some(task => task.id === editingTask.value.id)
  );

  if (column) {
    const taskIndex = column.tasks.findIndex(
      task => task.id === editingTask.value.id
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
    }
  });
};

const deleteColumnMethod = (columnId: number) => {
  deleteColumn({id: columnId});
  columns.value = columns.value.filter(col => col.id !== columnId);
};

const deleteTaskFunc = async (taskId: number) => {
  await deleteTask({id: taskId});
  columns.value.forEach(column => {
    column.tasks = column.tasks.filter((task: { id: number }) => task.id !== taskId);
  });
};

const editColumnModalVisible = ref(false);
const editingColumn = ref({
  id: null,
  title: '',
  bgColor: '#fff'
});

const openEditColumnModal = (column: { id: null; title: string; bgColor: string; } | { id: null; title: string; bgColor: string; }) => {
  editingColumn.value = { ...column };
  editColumnModalVisible.value = true;
};

const handleEditColumnOk = async () => {
  const column = columns.value.find(col => col.id === editingColumn.value.id);
  if (column) {
    column.title = editingColumn.value.title;
    column.bgColor = editingColumn.value.bgColor;
    await updateColumn(column);
  }
  editColumnModalVisible.value = false;
};
</script>

<style scoped>
.kanban-board {
  padding: 20px;
  height: calc(100vh - 40px);
}

.columns-container {
  display: flex;
  gap: 20px;
  height: 100%;
  padding: 10px;
  cursor: move;
}

.kanban-column {
  /* 添加拖拽时的视觉效果 */
  transition: transform 0.2s ease;
}

/* 拖拽时的样式 */
.kanban-column.sortable-ghost {
  opacity: 0.5;
}

.kanban-column {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: background-color 0.3s;
  /* border: 1px solid v-bind('token.colorSplit'); */ /* 移除边框，使用背景色区分 */
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-title-tag {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: v-bind('token.colorText');
  cursor: pointer;
  transition: all 0.3s;
}

.column-title-tag:hover {
  opacity: 0.8;
}

.task-count {
  font-size: 14px;
  color: v-bind('token.colorTextSecondary');
}

.more-btn {
  color: v-bind('token.colorTextSecondary');
  opacity: 0.6;
}

.more-btn:hover {
  opacity: 1;
  color: v-bind('token.colorText');
}

.task-list {
  flex: 1;
  min-height: 100px;
  padding: 4px;
  overflow-y: auto;
}

.kanban-task {
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: v-bind('token.colorBgContainer'); /* 纯白背景 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); /* 极淡的阴影 */
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kanban-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: v-bind('token.colorPrimary'); /* 悬浮显示主题色边框 */
}

.kanban-task:hover .delete-task-btn {
  opacity: 1;
}

.delete-task-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.task-title {
  font-weight: 600;
  font-size: 14px;
  color: v-bind('token.colorText');
  line-height: 1.5;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-tag {
  display: inline-block;
  padding: 2px 6px;
  background: v-bind('token.colorFillQuaternary');
  border-radius: 4px;
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
}

.task-props {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prop-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: v-bind('token.colorTextSecondary');
}

.prop-icon {
  font-size: 14px;
  opacity: 0.7;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: none; /* 移除分割线 */
  padding-top: 0;
  margin-top: 4px;
}

.due-date {
  font-size: 12px;
  color: v-bind('token.colorTextQuaternary');
}

.add-task-wrapper {
  margin-top: 8px;
  padding: 0 4px;
}

.simple-add-btn {
  height: 40px;
  border-radius: 6px;
  color: v-bind('token.colorTextSecondary');
  font-size: 16px;
  transition: all 0.3s;
}

.simple-add-btn:hover {
  background: v-bind('token.colorFillQuaternary');
  color: v-bind('token.colorText');
}

/* 隐藏不必要的样式 */
.delete-column-btn { display: none; }
.add-task-card { display: none; }


.subtasks-section {
  margin-top: 10px;
}

.subtasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.subtasks-title {
  font-size: 14px;
  font-weight: 500;
  color: v-bind('token.colorText');
  display: flex;
  align-items: center;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  /* max-height: 500px; */ /* Removed to allow modal body to scroll */
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
  opacity: 0;
  transition: opacity 0.2s;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.sortable-ghost {
  opacity: 0.5;
  background: v-bind('token.colorFillSecondary');
}

.subtask-completed {
  text-decoration: line-through;
  color: v-bind('token.colorTextQuaternary');
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
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.floating-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

</style>
