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
        <div class="kanban-column" :style="{ backgroundColor: getColumnStyle(column, index).bg }">
          <div class="column-header">
            <div class="header-left">
              <span 
                class="column-title-tag"
                :style="{ 
                  backgroundColor: getColumnStyle(column, index).headerBg,
                  color: getColumnStyle(column, index).headerColor
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
                
                <div class="task-meta" v-if="element.detail">
                  <div class="task-detail-text">
                    {{ element.detail.length > 50 ? element.detail.substring(0, 50) + '...' : element.detail }}
                  </div>
                </div>

                <div class="task-footer">
                  <div class="footer-left">
                    <clock-circle-outlined class="prop-icon" />
                    <span class="uncompleted-count">待办: {{ element.unCompletedCount || 0 }}</span>
                  </div>
                  <span class="due-date">{{ formatDate(element.dueDate) }}</span>
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
          @end="onDetailDragEnd"
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
              <a-popconfirm
                title="确定要删除这条明细吗?"
                ok-text="确定"
                cancel-text="取消"
                @confirm="removeDetail(index, detail)"
              >
                <a-button type="text" danger size="small">
                  <template #icon><delete-outlined /></template>
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </draggable>
      </div>
    </a-modal>

    <!-- 添加明细任务弹窗 -->
    <a-modal
      v-model:open="addDetailModalVisible"
      title="添加明细任务"
      @ok="handleAddDetailOk"
      @cancel="addDetailModalVisible = false"
    >
      <div style="display: flex; flex-direction: column; gap: 15px; padding: 10px 0;">
        <div>
          <div style="margin-bottom: 5px; font-size: 12px; color: #666;">任务内容</div>
          <a-input
            v-model:value="newDetail.content"
            placeholder="输入任务内容..."
            auto-focus
          />
        </div>
        <div style="display: flex; gap: 10px;">
          <div style="flex: 1">
            <div style="margin-bottom: 5px; font-size: 12px; color: #666;">开始时间</div>
            <a-date-picker
              show-time
              v-model:value="newDetail.startTime"
              placeholder="开始时间"
              style="width: 100%"
            />
          </div>
          <div style="flex: 1">
            <div style="margin-bottom: 5px; font-size: 12px; color: #666;">结束时间</div>
            <a-date-picker
              show-time
              v-model:value="newDetail.endTime"
              placeholder="结束时间"
              style="width: 100%"
            />
          </div>
        </div>
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

import { getTaskList, saveTask, updateTask, deleteTask, reSortTask, getTaskDetail, addTaskDetail, updateTaskDetail, deleteTaskDetail, reSortTaskDetail } from '#/api/core/todo';

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
  { bg: '#eff3f9', headerBg: '#dae5f5', headerColor: '#5285c5', label: '未开始' }, // 蓝
  { bg: '#fff9e6', headerBg: '#fff2cc', headerColor: '#d4a017', label: '修复中' }, // 黄
  { bg: '#f0f0ff', headerBg: '#e6e6ff', headerColor: '#6c5ce7', label: '验证中' }, // 紫
  { bg: '#eff9ef', headerBg: '#dcf0dc', headerColor: '#4b9e4b', label: '已完成' }, // 绿
];

// 获取列样式的辅助函数
const getColumnStyle = (column: any, index: number) => {
  const themeIndex = index % columnThemes.length;
  const currentTheme = columnThemes[themeIndex] || columnThemes[0] || { bg: '#eff3f9', headerBg: '#dae5f5', headerColor: '#5285c5' };
  
  // 优先使用列自身配置的 bgColor
  const bg = column.bgColor || currentTheme.bg;
  
  // 如果是自定义背景色，标题标签使用半透明遮罩以适应各种背景，否则使用主题配套颜色
  const headerBg = column.bgColor ? 'rgba(0, 0, 0, 0.06)' : currentTheme.headerBg;
  const headerColor = column.bgColor ? 'rgba(0, 0, 0, 0.65)' : currentTheme.headerColor;

  return {
    bg,
    headerBg,
    headerColor
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

const addDetail = () => {
  newDetail.value = {
    content: '',
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
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  flex-direction: column;
}

/* 自定义横向滚动条样式 */
.kanban-board::-webkit-scrollbar {
  height: 8px;
}

.kanban-board::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-board::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.kanban-board::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.columns-container {
  display: flex;
  gap: 16px;
  height: 100%;
  padding: 10px 10px 20px 10px; /* 底部留出滚动条空间 */
  width: max-content;
  min-width: 100%;
}

.kanban-column {
  flex: 0 0 300px;
  min-width: 300px;
  max-width: 300px;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 4px;
  cursor: grab;
}

.column-header:active {
  cursor: grabbing;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.column-title-tag {
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
}

.column-title-tag:hover {
  filter: brightness(0.9);
}

.task-count {
  font-size: 13px;
  font-weight: 500;
  color: #8c8c8c;
  background: rgba(0, 0, 0, 0.05);
  padding: 0 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
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
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kanban-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.task-title {
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  line-height: 1.5;
  flex: 1;
}

.delete-task-btn {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 4px;
}

.kanban-task:hover .delete-task-btn {
  opacity: 1;
}

.task-meta {
  margin-bottom: 4px;
}

.task-detail-text {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.6;
  background: #f8f9fa;
  padding: 6px 10px;
  border-radius: 6px;
  word-break: break-all;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #8c8c8c;
  font-size: 12px;
}

.due-date {
  font-size: 11px;
  color: #bfbfbf;
}

.add-task-wrapper {
  margin-top: 4px;
  display: flex;
  justify-content: center;
}

.simple-add-btn {
  height: 32px;
  color: #bfbfbf;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.simple-add-btn:hover {
  background: rgba(0, 0, 0, 0.02);
  color: #8c8c8c;
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
