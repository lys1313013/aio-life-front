<template>
  <div class="time-tracker">
    <!-- 标题和操作栏 -->
    <div class="header">
      <h2>24小时时间轴</h2>
      <div class="actions">
        <a-button type="primary" @click="showCategoryModal = true">
          <template #icon><SettingOutlined /></template>
          分类管理
        </a-button>
        <a-button @click="resetData">重置数据</a-button>
      </div>
    </div>

    <!-- 分类选择器 -->
    <div class="category-selector">
      <div class="category-label">当前分类：</div>
      <div class="category-buttons">
        <a-button
          v-for="category in config.categories"
          :key="category.id"
          :type="currentCategoryId === category.id ? 'primary' : 'default'"
          @click="currentCategoryId = category.id"
          :style="{ borderColor: category.color }"
        >
          <div class="category-button-content">
            <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
            {{ category.name }}
          </div>
        </a-button>
      </div>
    </div>

    <!-- 时间轴容器 -->
    <div class="timeline-container">
      <!-- 时间刻度 -->
      <div class="time-scale">
        <div
          v-for="hour in 24"
          :key="hour"
          class="hour-marker"
          :style="{ left: `${(hour / 24) * 100}%` }"
        >
          <span class="hour-label">{{ hour.toString().padStart(2, '0') }}:00</span>
        </div>
      </div>

      <!-- 时间轴轨道 -->
      <div
        ref="timelineRef"
        class="timeline-track"
        @mousedown="handleTrackMouseDown"
        @mousemove="handleTrackMouseMove"
        @mouseup="handleTrackMouseUp"
        @mouseleave="handleTrackMouseLeave"
      >
        <!-- 时间段 -->
        <div
          v-for="slot in timeSlots"
          :key="slot.id"
          class="time-slot"
          :style="getSlotStyle(slot)"
          @mousedown="handleSlotMouseDown($event, slot)"
          @click="handleSlotClick(slot)"
        >
          <div class="slot-content">
            <div class="slot-title">{{ slot.title }}</div>
            <div class="slot-time">{{ formatSlotTime(slot) }}</div>
          </div>
          
          <!-- 调整手柄 -->
          <div class="resize-handle left" @mousedown="handleResizeStart($event, slot, 'left')"></div>
          <div class="resize-handle right" @mousedown="handleResizeStart($event, slot, 'right')"></div>
        </div>

        <!-- 拖拽预览 -->
        <div
          v-if="dragOperation"
          class="drag-preview"
          :style="getDragPreviewStyle()"
        ></div>
      </div>

      <!-- 当前时间指示器 -->
      <div
        v-if="showCurrentTime"
        class="current-time-indicator"
        :style="{ left: `${(currentTime / 1440) * 100}%` }"
      >
        <div class="indicator-line"></div>
        <div class="indicator-label">{{ minutesToTime(currentTime) }}</div>
      </div>
    </div>

    <!-- 时间段统计 -->
    <div class="statistics">
      <a-card title="时间段统计" class="stats-card">
        <div class="stats-content">
          <div class="stat-item">
            <span class="stat-label">总时间段数：</span>
            <span class="stat-value">{{ timeSlots.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总时长：</span>
            <span class="stat-value">{{ formatDuration(totalDuration) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">空闲时间：</span>
            <span class="stat-value">{{ formatDuration(1440 - totalDuration) }}</span>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 时间段编辑模态框 -->
    <a-modal
      v-model:open="showEditModal"
      title="编辑时间段"
      :width="600"
      :footer="null"
      @cancel="handleEditCancel"
    >
      <TimeSlotEditForm
        v-if="editingSlot"
        :slot="editingSlot"
        :categories="config.categories"
        @save="handleSaveSlot"
        @delete="handleDeleteSlot"
        @cancel="handleEditCancel"
      />
    </a-modal>

    <!-- 分类管理模态框 -->
    <a-modal
      v-model:open="showCategoryModal"
      title="分类管理"
      :width="800"
      :footer="null"
    >
      <CategoryManager
        :categories="config.categories"
        @update="handleCategoriesUpdate"
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SettingOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { TimeSlot, TimeSlotCategory, DragOperation } from './types';
import { defaultConfig } from './config';
import {
  minutesToTime,
  formatSlotTime,
  formatDuration,
  getTimeFromPosition,
  snapToGrid,
  hasOverlap,
  isValidSlot,
  generateId,
  getSlotPosition
} from './utils';
import TimeSlotEditForm from './components/TimeSlotEditForm.vue';
import CategoryManager from './components/CategoryManager.vue';

// 响应式数据
const timelineRef = ref<HTMLElement>();
const timeSlots = ref<TimeSlot[]>([]);
const currentCategoryId = ref(defaultConfig.defaultCategoryId);
const dragOperation = ref<DragOperation | null>(null);
const showEditModal = ref(false);
const showCategoryModal = ref(false);
const editingSlot = ref<TimeSlot | null>(null);
const currentTime = ref(0);
const showCurrentTime = ref(true);

// 配置
const config = ref(defaultConfig);

// 计算属性
const totalDuration = computed(() => {
  return timeSlots.value.reduce((total, slot) => total + (slot.endTime - slot.startTime), 0);
});

// 生命周期
onMounted(() => {
  loadData();
  startCurrentTimeUpdater();
});

onUnmounted(() => {
  stopCurrentTimeUpdater();
});

// 数据管理
const loadData = () => {
  // 从本地存储加载数据
  const saved = localStorage.getItem('time-tracker-slots');
  if (saved) {
    try {
      timeSlots.value = JSON.parse(saved);
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }
};

const saveData = () => {
  localStorage.setItem('time-tracker-slots', JSON.stringify(timeSlots.value));
};

const resetData = () => {
  console.log('重置数据按钮被点击');
  timeSlots.value = [];
  saveData();
  message.success('数据已重置');
};

// 当前时间更新器
let timeUpdater: number;
const startCurrentTimeUpdater = () => {
  const updateCurrentTime = () => {
    const now = new Date();
    currentTime.value = now.getHours() * 60 + now.getMinutes();
  };
  
  updateCurrentTime();
  timeUpdater = setInterval(updateCurrentTime, 60000); // 每分钟更新一次
};

const stopCurrentTimeUpdater = () => {
  if (timeUpdater) {
    clearInterval(timeUpdater);
  }
};

// 样式计算
const getSlotStyle = (slot: TimeSlot) => {
  if (!timelineRef.value) return {};
  
  const { left, width } = getSlotPosition(slot, timelineRef.value.offsetWidth);
  const category = config.value.categories.find(cat => cat.id === slot.categoryId);
  
  return {
    left: `${left}px`,
    width: `${width}px`,
    backgroundColor: category?.color || '#d9d9d9'
  };
};

const getDragPreviewStyle = () => {
  if (!dragOperation.value || !timelineRef.value) return {};
  
  const startTime = Math.min(dragOperation.value.startTime, dragOperation.value.currentTime);
  const endTime = Math.max(dragOperation.value.startTime, dragOperation.value.currentTime);
  const duration = endTime - startTime;
  
  if (duration < config.value.minSlotDuration) return {};
  
  const left = (startTime / 1440) * timelineRef.value.offsetWidth;
  const width = (duration / 1440) * timelineRef.value.offsetWidth;
  const category = config.value.categories.find(cat => cat.id === currentCategoryId.value);
  
  return {
    left: `${left}px`,
    width: `${width}px`,
    backgroundColor: category?.color + '80' // 半透明
  };
};

// 事件处理函数
const handleTrackMouseDown = (event: MouseEvent) => {
  if (!timelineRef.value) return;
  
  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const startTime = snapToGrid(getTimeFromPosition(x, timelineRef.value.offsetWidth));
  
  dragOperation.value = {
    type: 'create',
    startX: x,
    startTime,
    currentTime: startTime
  };
};

const handleTrackMouseMove = (event: MouseEvent) => {
  if (!dragOperation.value || !timelineRef.value) return;
  
  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  dragOperation.value.currentTime = snapToGrid(getTimeFromPosition(x, timelineRef.value.offsetWidth));
  
  // 处理时间段移动和调整大小
  if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    const deltaX = x - dragOperation.value.startX;
    const deltaTime = getTimeFromPosition(deltaX, timelineRef.value.offsetWidth);
    
    const slot = timeSlots.value.find(s => s.id === dragOperation.value!.slotId);
    if (!slot) return;
    
    if (dragOperation.value.type === 'move') {
      // 移动时间段
      const newStartTime = Math.max(0, Math.min(1440 - (slot.endTime - slot.startTime), dragOperation.value.startTime + deltaTime));
      const newEndTime = newStartTime + (slot.endTime - slot.startTime);
      
      const movedSlot = { ...slot, startTime: newStartTime, endTime: newEndTime };
      
      // 检查是否重叠（排除自身）
      const otherSlots = timeSlots.value.filter(s => s.id !== slot.id);
      if (!hasOverlap(otherSlots, movedSlot)) {
        slot.startTime = newStartTime;
        slot.endTime = newEndTime;
      }
    } else if (dragOperation.value.type === 'resize') {
      // 调整时间段大小
      const newTime = Math.max(0, Math.min(1440, dragOperation.value.startTime + deltaTime));
      
      if (dragOperation.value.slotId) {
        const resizeSlot = timeSlots.value.find(s => s.id === dragOperation.value!.slotId);
        if (!resizeSlot) return;
        
        const originalStart = resizeSlot.startTime;
        const originalEnd = resizeSlot.endTime;
        
        if (dragOperation.value.startTime === originalStart) {
          // 调整左侧（开始时间）
          const minEndTime = originalStart + config.value.minSlotDuration;
          const newStartTime = Math.min(newTime, originalEnd - config.value.minSlotDuration);
          resizeSlot.startTime = Math.max(0, newStartTime);
        } else {
          // 调整右侧（结束时间）
          const maxStartTime = originalEnd - config.value.minSlotDuration;
          const newEndTime = Math.max(newTime, originalStart + config.value.minSlotDuration);
          resizeSlot.endTime = Math.min(1440, newEndTime);
        }
        
        // 检查是否重叠（排除自身）
        const otherSlots = timeSlots.value.filter(s => s.id !== resizeSlot.id);
        if (hasOverlap(otherSlots, resizeSlot)) {
          // 如果重叠，恢复原值
          resizeSlot.startTime = originalStart;
          resizeSlot.endTime = originalEnd;
        }
      }
    }
  }
};

const handleTrackMouseUp = () => {
  if (!dragOperation.value) {
    dragOperation.value = null;
    return;
  }
  
  if (dragOperation.value.type === 'create') {
    // 创建新时间段
    const startTime = Math.min(dragOperation.value.startTime, dragOperation.value.currentTime);
    const endTime = Math.max(dragOperation.value.startTime, dragOperation.value.currentTime);
    const duration = endTime - startTime;
    
    if (duration >= config.value.minSlotDuration) {
      const newSlot: TimeSlot = {
        id: generateId(),
        startTime,
        endTime,
        categoryId: currentCategoryId.value,
        title: getCategoryName(currentCategoryId.value, config.value.categories)
      };
      
      if (!hasOverlap(timeSlots.value, newSlot)) {
        timeSlots.value.push(newSlot);
        saveData();
        message.success('时间段创建成功');
      } else {
        message.error('时间段重叠，请重新选择');
      }
    }
  } else if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    // 时间段移动或调整大小完成，保存数据
    saveData();
    message.success(dragOperation.value.type === 'move' ? '时间段移动成功' : '时间段调整成功');
  }
  
  dragOperation.value = null;
};

const handleTrackMouseLeave = () => {
  if (dragOperation.value?.type === 'create') {
    dragOperation.value = null;
  }
};

const handleSlotMouseDown = (event: MouseEvent, slot: TimeSlot) => {
  event.stopPropagation();
  
  if (!timelineRef.value) return;
  
  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  
  dragOperation.value = {
    type: 'move',
    slotId: slot.id,
    startX: x,
    startTime: slot.startTime,
    currentTime: slot.startTime
  };
};

const handleResizeStart = (event: MouseEvent, slot: TimeSlot, direction: 'left' | 'right') => {
  event.stopPropagation();
  
  if (!timelineRef.value) return;
  
  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  
  dragOperation.value = {
    type: 'resize',
    slotId: slot.id,
    startX: x,
    startTime: direction === 'left' ? slot.startTime : slot.endTime,
    currentTime: direction === 'left' ? slot.startTime : slot.endTime
  };
};

const handleSlotClick = (slot: TimeSlot) => {
  if (dragOperation.value) return; // 防止拖拽后触发点击
  
  editingSlot.value = { ...slot };
  showEditModal.value = true;
};

const handleSaveSlot = (formData: any) => {
  const index = timeSlots.value.findIndex(slot => slot.id === formData.id);
  
  if (index !== -1) {
    const updatedSlot = { ...timeSlots.value[index], ...formData };
    
    if (isValidSlot(updatedSlot, config.value) && !hasOverlap(timeSlots.value, updatedSlot)) {
      timeSlots.value[index] = updatedSlot;
      saveData();
      message.success('时间段更新成功');
      showEditModal.value = false;
    } else {
      message.error('时间段无效或重叠');
    }
  }
};

const handleDeleteSlot = (slotId: string) => {
  timeSlots.value = timeSlots.value.filter(slot => slot.id !== slotId);
  saveData();
  message.success('时间段删除成功');
  showEditModal.value = false;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  editingSlot.value = null;
};

const handleCategoriesUpdate = (categories: TimeSlotCategory[]) => {
  config.value.categories = categories;
  showCategoryModal.value = false;
  message.success('分类更新成功');
};

// 工具函数
const getCategoryName = (categoryId: string, categories: TimeSlotCategory[]) => {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.name || '未知';
};
</script>

<style scoped>
.time-tracker {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #262626;
}

.actions {
  display: flex;
  gap: 10px;
}

.category-selector {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 6px;
}

.category-label {
  font-weight: 500;
  margin-right: 15px;
  color: #595959;
}

.category-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-button-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.timeline-container {
  position: relative;
  margin-bottom: 30px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.time-scale {
  position: relative;
  height: 30px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
}

.hour-marker {
  position: absolute;
  top: 0;
  height: 100%;
  width: 1px;
  background: #d9d9d9;
}

.hour-label {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 12px;
  color: #8c8c8c;
}

.timeline-track {
  position: relative;
  height: 80px;
  background: #f8f9fa;
  cursor: crosshair;
  user-select: none;
}

.time-slot {
  position: absolute;
  top: 10px;
  height: 60px;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.time-slot:hover {
  border-color: rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.slot-content {
  padding: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  font-weight: 500;
}

.slot-title {
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-time {
  font-size: 12px;
  opacity: 0.9;
}

.resize-handle {
  position: absolute;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-handle.left {
  left: 0;
}

.resize-handle.right {
  right: 0;
}

.time-slot:hover .resize-handle {
  opacity: 1;
  background: rgba(255, 255, 255, 0.5);
}

.drag-preview {
  position: absolute;
  top: 10px;
  height: 60px;
  border: 2px dashed rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  pointer-events: none;
}

.current-time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
}

.indicator-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: #ff4d4f;
  transform: translateX(-50%);
}

.indicator-label {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #ff4d4f;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
}

.statistics {
  margin-top: 20px;
}

.stats-card {
  max-width: 400px;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #595959;
}

.stat-value {
  font-weight: 500;
  color: #262626;
}
</style>