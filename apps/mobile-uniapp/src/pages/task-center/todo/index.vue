<template>
  <view class="todo-container">
    <view v-if="columns.length > 0">
      <uni-segmented-control
        :current="currentTabIndex"
        :values="columnNames"
        @clickItem="onClickTab"
        styleType="text"
        activeColor="#007AFF"
      />
    </view>
    
    <scroll-view scroll-y class="task-list" v-if="currentTasks.length > 0">
      <view
        v-for="task in currentTasks"
        :key="task.id"
        class="task-card"
      >
        <view class="task-header">
          <text class="task-title">{{ task.content }}</text>
        </view>
        <view class="task-meta" v-if="task.dueDate">
          <uni-icons type="calendar" size="14" color="#999" />
          <text class="meta-text">{{ task.dueDate }}</text>
        </view>
        <view class="task-progress" v-if="task.details && task.details.length > 0">
          <text class="progress-text">子任务: {{ completedDetailCount(task) }} / {{ task.details.length }}</text>
        </view>
        <view class="task-actions">
          <button size="mini" class="action-btn" @click="checkTask(task)">完成</button>
        </view>
      </view>
    </scroll-view>

    <view class="empty-state" v-else>
      <text class="empty-text">暂无任务</text>
    </view>

    <view class="fab" @click="openAddTask">
      <uni-icons type="plusempty" size="24" color="#fff" />
    </view>

    <!-- 添加任务弹窗 -->
    <uni-popup ref="addTaskPopup" type="bottom" background-color="#fff">
      <view class="popup-content">
        <view class="popup-header">
          <text class="popup-title">新建任务</text>
          <uni-icons type="closeempty" size="24" @click="closeAddTask" />
        </view>
        <view class="popup-body">
          <input class="task-input" v-model="newTaskContent" placeholder="输入任务内容..." />
        </view>
        <view class="popup-footer">
          <button class="submit-btn primary" @click="submitTask">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getTaskColumnList, getTaskList, saveTask, updateTask } from '@/api/todo';
import type { TaskColumn, Task } from '@/api/todo';

const columns = ref<TaskColumn[]>([]);
const currentTabIndex = ref(0);
const allTasks = ref<Task[]>([]);
const addTaskPopup = ref<any>(null);
const newTaskContent = ref('');

const columnNames = computed(() => columns.value.map(c => c.name));
const currentColumn = computed(() => columns.value[currentTabIndex.value]);

const currentTasks = computed(() => {
  if (!currentColumn.value) return [];
  return allTasks.value.filter(t => t.columnId === currentColumn.value.id);
});

onMounted(() => {
  fetchData();
});

async function fetchData() {
  try {
    const colRes: any = await getTaskColumnList();
    const colList = colRes?.items || colRes?.records || colRes?.list || (Array.isArray(colRes) ? colRes : []);
    if (colList && colList.length > 0) {
      columns.value = colList.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
    }
    
    const taskRes: any = await getTaskList();
    const tList = taskRes?.items || taskRes?.records || taskRes?.list || (Array.isArray(taskRes) ? taskRes : []);
    if (tList) {
      allTasks.value = tList;
    }
  } catch (error) {
    console.error('Failed to fetch todo data', error);
  }
}

function onClickTab(e: { currentIndex: number }) {
  currentTabIndex.value = e.currentIndex;
}

function completedDetailCount(task: Task) {
  if (!task.details) return 0;
  return task.details.filter(d => d.isCompleted === 1).length;
}

function openAddTask() {
  newTaskContent.value = '';
  addTaskPopup.value?.open();
}

function closeAddTask() {
  addTaskPopup.value?.close();
}

async function submitTask() {
  if (!newTaskContent.value.trim() || !currentColumn.value) {
    uni.showToast({ title: '内容不能为空', icon: 'none' });
    return;
  }
  try {
    await saveTask({
      columnId: currentColumn.value.id,
      content: newTaskContent.value.trim()
    });
    uni.showToast({ title: '添加成功' });
    closeAddTask();
    fetchData();
  } catch (error) {
    console.error(error);
  }
}

async function checkTask(task: Task) {
  uni.showModal({
    title: '提示',
    content: '确认完成该任务？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const doneColumn = columns.value.find(c => c.name === '已完成' || c.name === 'Done');
          if (doneColumn) {
            await updateTask({
              ...task,
              columnId: doneColumn.id
            });
            uni.showToast({ title: '任务已完成', icon: 'success' });
            fetchData();
          } else {
            uni.showToast({ title: '未找到已完成列', icon: 'none' });
          }
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' });
        }
      }
    }
  });
}
</script>

<style lang="scss" scoped>
.todo-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.task-list {
  padding: 20rpx;
  height: calc(100vh - 100rpx);
}

.task-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

  .task-header {
    margin-bottom: 16rpx;
    .task-title {
      font-size: 32rpx;
      color: #333;
      font-weight: 500;
    }
  }

  .task-meta {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
    .meta-text {
      font-size: 24rpx;
      color: #999;
      margin-left: 8rpx;
    }
  }

  .task-progress {
    margin-bottom: 16rpx;
    .progress-text {
      font-size: 24rpx;
      color: #666;
    }
  }

  .task-actions {
    display: flex;
    justify-content: flex-end;
    .action-btn {
      margin: 0;
      background-color: #f0f9eb;
      color: #67c23a;
      border: 1px solid #c2e7b0;
      border-radius: 8rpx;
    }
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;
  .empty-text {
    color: #999;
    font-size: 28rpx;
  }
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 40rpx;
  width: 100rpx;
  height: 100rpx;
  background-color: #007AFF;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 122, 255, 0.4);
  z-index: 99;
}

.popup-content {
  padding: 30rpx;
  border-top-left-radius: 24rpx;
  border-top-right-radius: 24rpx;
  
  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .popup-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .popup-body {
    margin-bottom: 30rpx;
    
    .task-input {
      background: #f5f5f5;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
    }
  }
  
  .popup-footer {
    .submit-btn {
      width: 100%;
      border-radius: 12rpx;
    }
    .primary {
      background-color: #007AFF;
      color: #fff;
    }
  }
}
</style>
