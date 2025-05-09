<template>
  <div class="kanban-board">
    <draggable
      v-model="columns"
      group="columns"
      @end="onColumnDragEnd"
      item-key="id"
      class="columns-container"
    >
      <template #item="{ element: column }">
        <div class="kanban-column">
          <div class="column-header">
            <h3
              @click="openEditColumnModal(column)"
              :style="{
                backgroundColor: column.bgColor || '#fff',
                borderRadius: '6px',
                padding: '4px 10px',
                margin: '0',
                transition: 'all 0.3s'
              }"
            >{{ column.title }}</h3>
            <a-button
              type="text"
              danger
              @click.stop="confirmDeleteColumn(column.id)"
              class="delete-column-btn"
            >
              <template #icon><delete-outlined style="color: #8c8c8c; font-size: 14px" /></template>
            </a-button>
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
                  <p>{{ element.content }}</p>
                  <a-popconfirm
                    title="确定要删除这个任务吗?"
                    ok-text="确定"
                    cancel-text="取消"
                    @click.stop
                    @confirm="deleteTaskFunc(element.id)"
                  >
                    <a-button
                      type="text"
                      danger
                      class="delete-task-btn"
                    >
                      <template #icon><delete-outlined style="color: #8c8c8c; font-size: 14px" /></template>
                    </a-button>
                  </a-popconfirm>
                </div>
                <br>
                <small v-if="element.dueDate">目标完成: {{ formatDate(element.dueDate) }}</small>
                <br>
                <br>
                <small style="display: block; text-align: right"> {{ formatDate(element.createdAt) }}</small>
              </div>
            </template>
            <template #footer>
              <div class="add-task-card">
                <a-button type="text" @click="addTask(column.id)" class="simple-add-btn">
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
      v-model:visible="editModalVisible"
      title="编辑任务"
      @ok="handleEditOk"
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
      <a-textarea
        v-model:value="editingTask.detail"
        placeholder="任务明细"
        :rows="4"
      />

      <a-date-picker
        v-model:value="editingTask.dueDate"
        placeholder="目标完成时间"
        style="margin-top: 10px; width: 100%"
      />
    </a-modal>
    <a-modal
      v-model:visible="editColumnModalVisible"
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
        <a-input :style="{ backgroundColor: editingColumn.bgColor || '#fff'}"
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
import { Button as AButton, Input as AInput, Textarea as ATextarea, Modal as AModal, DatePicker as ADatePicker, Popconfirm as APopconfirm } from 'ant-design-vue';

import { getTaskColumnList, saveColumn, updateColumn, deleteColumn, reSortColumn} from '#/api/core/todo';

import { getTaskList, saveTask, updateTask, deleteTask, reSortTask } from '#/api/core/todo';

import dayjs from 'dayjs';
import { PlusOutlined } from '@ant-design/icons-vue';
import { Popover as APopover } from 'ant-design-vue';
import { DeleteOutlined } from '@ant-design/icons-vue';
import { Modal } from 'ant-design-vue';

const columns = ref<Array<{
  id: number;
  title: string;
  tasks: Array<{
    id: number;
    content: string;
    detail?: string;
  }>;
  bgColor?: string;
}>>([]);

onMounted(async () => {
  // 初始化列
  const res = await getTaskColumnList({});
  console.log('getTaskColumnList', res);
  columns.value = res.items;

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
    let newTask = {
      id: 0,
      content: '新任务',
      detail: '',
      createdAt: new Date(),
      columnId: columnId
    };
    newTask = await saveTask(newTask);
    column.tasks.push(newTask);
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
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const editModalVisible = ref(false);
const editingTask = ref({
  id: null,
  content: '',
  detail: '',
  dueDate: null,
  createdAt: null,
});

// 打开编辑模态框
const openEditModal = (task: { id: null; content: string; dueDate: null; createdAt: null; } | { id: null; content: string; dueDate: null; createdAt: null; }) => {
  let dueDate = task.dueDate ? dayjs(task.dueDate) : '';

  editingTask.value = {
    ...task,
    dueDate: dueDate,
  };
  editModalVisible.value = true;
};

// 编辑任务
const handleEditOk = () => {
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
  updateTask(editingTask.value);
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
.kanban-column.sortable-chosen {
  /* box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); */
}

.kanban-column.sortable-ghost {
  opacity: 0.5;
}

.kanban-column {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.column-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.delete-column-btn {
  position: absolute;
  right: 0;
  top: 0;
  padding: 0;
  color: #8c8c8c; /* 添加灰色 */
  font-size: 14px; /* 缩小字体 */
}

.add-task-card {
  margin-top: 10px;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.simple-add-btn {
  width: 100%;
  color: #8c8c8c; /* 改为灰色 */
  font-size: 16px;
}

.simple-add-btn:hover {
  color: #595959; /* 悬停时深灰色 */
}

.column-header .ant-btn {
  background: transparent;
  border: none;
  color: #1890ff;
  font-size: 20px;
  padding: 0 8px;
}

.task-list {
  flex: 1;
  min-height: 100px;
  border-radius: 4px;
  padding: 10px;
  overflow-y: auto;
}

.kanban-task {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: move;
  transition: all 0.3s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.kanban-task:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.add-column {
  min-width: 300px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

.delete-column-btn:hover .anticon {
  color: #ff4d4f !important; /* danger 的红色 */
}
.task-header {
  position: relative;
}

.delete-task-btn {
  position: absolute;
  right: 0;
  top: 0;
  padding: 0;
  color: #8c8c8c;
  font-size: 14px;
  opacity: 0; /* 默认隐藏 */
  transition: opacity 0.3s; /* 添加过渡效果 */
}

.kanban-task:hover .delete-task-btn {
  opacity: 1; /* 鼠标悬停时显示 */
}

.delete-task-btn:hover .anticon {
  color: #ff4d4f !important;
}

/* 添加标题悬停效果 */
.column-header h3:hover {
  cursor: pointer;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
