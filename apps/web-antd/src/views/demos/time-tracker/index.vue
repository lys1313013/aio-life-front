<template>
  <div class="time-tracker">
    <!-- 标题和操作栏 -->
    <div class="header">
      <div class="header-left">
        <!-- 统计模式切换 -->
        <Radio.Group v-model:value="statMode" @change="handleStatModeChange" :disabled="loading">
          <Radio.Button value="day">日</Radio.Button>
          <Radio.Button value="week">周</Radio.Button>
        </Radio.Group>

        <div class="date-picker-container">
          <Button
            type="default"
            @click="goToPreviousPeriod"
            :disabled="loading"
            class="date-nav-button"
          >
            <template #icon><LeftOutlined /></template>
          </Button>
          <DatePicker
            v-model:value="selectedDate"
            format="YYYY-MM-DD"
            placeholder="选择日期"
            @change="handleDateChange"
            :disabled-date="disabledDate"
            :disabled="loading"
          />
          <Button
            type="default"
            @click="goToNextPeriod"
            :disabled="loading"
            class="date-nav-button"
          >
            <template #icon><RightOutlined /></template>
          </Button>
        </div>
      </div>
      <div class="actions">
        <Button type="primary" @click="handleAddSlot" :disabled="loading">
          <template #icon><PlusOutlined /></template>
        </Button>
        <Button type="primary" @click="showCategoryModal = true" :disabled="loading">
          <template #icon><SettingOutlined /></template>
          分类管理
        </Button>
        <Button @click="resetData" :disabled="loading">清除数据</Button>
        <Button
          v-if="statMode === 'day'"
          @click="copyPreviousDayData"
          :disabled="loading"
          type="dashed"
        >
          <template #icon><CopyOutlined /></template>
          复制上一天
        </Button>
      </div>
    </div>

    <!-- 分类选择器 -->
    <div class="category-selector">
      <div class="category-label">当前分类：</div>
      <div class="category-buttons">
        <Button
          v-for="category in config.categories"
          :key="category.id"
          :type="currentCategoryId === category.id ? 'primary' : 'default'"
          @click="currentCategoryId = category.id"
          :style="{ borderColor: category.color }"
          :disabled="loading"
        >
          <div class="category-button-content">
            <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
            {{ category.name }}
          </div>
        </Button>
      </div>
    </div>

    <!-- 时间轴容器 -->
    <Spin :spinning="loading" size="large">
      <!-- 按周统计模式 -->
      <template v-if="statMode === 'week'">
        <div class="week-timeline-container">
          <!-- 星期标题行 -->
          <div class="week-header">
            <div class="time-scale-header"></div>
            <div
              v-for="(day, index) in weekDays"
              :key="index"
              class="week-day-header"
              @click="selectWeekDay(index)"
              :class="{ active: selectedWeekDayIndex === index }"
            >
              <div class="day-name">{{ day.weekday }}</div>
              <div class="day-date">{{ day.date }}</div>
            </div>
          </div>

          <!-- 星期时间轴 -->
          <div class="week-timeline-wrapper">
            <!-- 时间刻度 -->
            <div class="time-scale">
              <div
                v-for="hour in 24"
                :key="hour"
                class="hour-marker"
                :style="{ top: `${(hour / 24) * 100}%` }"
              >
                <span class="hour-label">{{ hour.toString().padStart(2, '0') }}:00</span>
              </div>
            </div>

            <!-- 每天的时间轴 -->
            <div class="week-days-container">
              <div
                v-for="(day, index) in weekDays"
                :key="index"
                class="week-day-track"
              >
                <!-- 时间段 -->
                <div
                  v-for="slot in getDaySlots(day.date)"
                  :key="slot.id"
                  class="time-slot"
                  :style="{ ...getSlotStyle(slot), pointerEvents: loading ? 'none' : 'auto' }"
                  @mousedown="handleSlotMouseDown($event, slot)"
                  @click="handleSlotClick(slot)"
                >
                  <div class="slot-content">
                    <div class="slot-info">
                      <span class="slot-title">{{ slot.title }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 按天统计模式 -->
      <template v-else>
        <div class="timeline-container">
          <!-- 时间刻度 -->
          <div class="time-scale">
            <div
              v-for="hour in 24"
              :key="hour"
              class="hour-marker"
              :style="{ top: `${(hour / 24) * 100}%` }"
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
            :style="{ cursor: loading ? 'not-allowed' : 'crosshair' }"
          >
          <!-- 时间段 -->
          <div
            v-for="slot in timeSlots"
            :key="slot.id"
            class="time-slot"
            :style="{ ...getSlotStyle(slot), pointerEvents: loading ? 'none' : 'auto' }"
            @mousedown="handleSlotMouseDown($event, slot)"
            @click="handleSlotClick(slot)"
          >
            <div class="slot-content">
              <div class="slot-info">
                <span class="slot-title">{{ slot.title }}</span>
                <span class="slot-time">{{ formatSlotTime(slot) }}</span>
              </div>
            </div>

            <!-- 调整手柄 -->
            <div class="resize-handle top" @mousedown="handleResizeStart($event, slot, 'top')"></div>
            <div class="resize-handle bottom" @mousedown="handleResizeStart($event, slot, 'bottom')"></div>
          </div>

          <!-- 拖拽预览 -->
          <div
            v-if="dragOperation"
            class="drag-preview"
            :style="getDragPreviewStyle()"
          ></div>
        </div>
      </div>
      </template>
    </Spin>

    <!-- 时间段统计 -->
    <div class="statistics">
      <div class="stats-row">
        <Card :title="`时间段统计`" class="stats-card">
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
              <span class="stat-value">{{ formatDuration(freeTime) }}</span>
            </div>
          </div>
        </Card>

        <!-- 时间分类饼图 -->
        <TimeCategoryPieChart
          :time-slots="timeSlots"
          :categories="config.categories"
          :selected-date="selectedDate"
        />
      </div>
    </div>

    <!-- 时间段编辑模态框 -->
    <Modal
      v-model:open="showEditModal"
      :title="editModalTitle"
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
    </Modal>

    <!-- 分类管理模态框 -->
    <Modal
      v-model:open="showCategoryModal"
      title="分类管理"
      :width="800"
      :footer="null"
    >
      <CategoryManager
        :categories="config.categories"
        @update="handleCategoriesUpdate"
      />
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SettingOutlined, PlusOutlined, CopyOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons-vue';
import { Button, Card, Modal, message, DatePicker, Spin, Radio } from 'ant-design-vue';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

// 扩展dayjs插件
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
import type { TimeSlot, TimeSlotCategory, DragOperation } from './types';
import { defaultConfig } from './config';
import {
  formatSlotTime,
  formatDuration,
  getTimeFromPosition,
  snapToGrid,
  hasOverlap,
  isValidSlot,
  generateId,
  getSlotPosition,
  getBelowSlotStartTime
} from './utils';
import TimeSlotEditForm from './components/TimeSlotEditForm.vue';
import CategoryManager from './components/CategoryManager.vue';
import TimeCategoryPieChart from './components/TimeCategoryPieChart.vue';
import { query, queryForWeek, batchUpdate, update, deleteByDate } from '#/api/core/time-tracker';

// 响应式数据
const timelineRef = ref<HTMLElement>();
const timeSlots = ref<TimeSlot[]>([]);
const currentCategoryId = ref(defaultConfig.defaultCategoryId);
const dragOperation = ref<DragOperation | null>(null);
const showEditModal = ref(false);
const showCategoryModal = ref(false);
const editingSlot = ref<TimeSlot | null>(null);
const currentTime = ref(0);
const selectedDate = ref(dayjs());
const loading = ref(false); // 新增loading状态
const statMode = ref<'day' | 'week'>('day'); // 统计模式：day - 按天，week - 按周
const selectedWeekDayIndex = ref(0); // 当前选中的星期几索引

// 配置
const config = ref(defaultConfig);

// 计算属性
const totalDuration = computed(() => {
  return timeSlots.value.reduce((total, slot) => total + (slot.endTime - slot.startTime + 1), 0);
});

// 计算空闲时间
const freeTime = computed(() => {
  if (statMode.value === 'week') {
    // 按周统计：一周总时间 = 7天 * 1440分钟 = 10080分钟
    const totalWeekMinutes = 7 * 1440;
    const freeTime = totalWeekMinutes - totalDuration.value;
    // 确保空闲时间不为负数
    return Math.max(0, freeTime);
  } else {
    // 按天统计：一天总时间 = 1440分钟
    const freeTime = 1440 - totalDuration.value;
    // 确保空闲时间不为负数
    return Math.max(0, freeTime);
  }
});

// 计算当前周的所有日期
const weekDays = computed(() => {
  const currentDay = selectedDate.value;
  const startOfWeek = currentDay.startOf('isoWeek'); // 周一为一周的开始
  const days = [];

  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  for (let i = 0; i < 7; i++) {
    const day = startOfWeek.add(i, 'day');
    days.push({
      date: day.format('YYYY-MM-DD'),
      weekday: weekdays[i],
      dayjs: day
    });
  }

  return days;
});



// 获取当前选中日期
const getCurrentSelectedDate = () => {
  if (statMode.value === 'week') {
    return weekDays.value[selectedWeekDayIndex.value]?.date || selectedDate.value.format('YYYY-MM-DD');
  }
  return selectedDate.value.format('YYYY-MM-DD');
};

// 编辑模态框标题
const editModalTitle = computed(() => {
  if (!editingSlot.value) return '编辑时间段';

  // 判断是新增还是编辑：如果时间段ID在现有时间段中不存在，则是新增
  const isExisting = timeSlots.value.some(slot => slot.id === editingSlot.value?.id);
  return isExisting ? '编辑时间段' : '新增时间段';
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
const loadData = async () => {
  try {
    loading.value = true; // 开始加载

    let response;

    if (statMode.value === 'week') {
      // 按周查询，查询参数为时间区间
      const weekDaysValue = weekDays.value;
      const startDate = weekDaysValue.length > 0 ? weekDaysValue[0].date : '';
      const endDate = weekDaysValue.length > 6 ? weekDaysValue[6].date : '';
      const queryParams = { condition: { startDate, endDate } };

      // 调用按周查询接口
      response = await queryForWeek(queryParams);

      // 确保返回的数据是数组格式
      if (Array.isArray(response)) {
        timeSlots.value = response;
      } else if (response && response.items) {
        // 如果返回的是QueryResponse格式，提取items
        timeSlots.value = response.items;
      } else {
        timeSlots.value = [];
      }

      console.log('最终设置的时间段数据:', timeSlots.value);
    } else {
      // 按天查询
      const currentDate = selectedDate.value.format('YYYY-MM-DD');
      const queryParams = { condition: { date: currentDate } };

      console.log('按天查询参数:', queryParams);

      // 调用普通查询接口
      response = await query(queryParams);
      console.log('按天查询返回数据:', response);

      if (response && response.items) {
        timeSlots.value = response.items;
      } else {
        timeSlots.value = [];
      }
    }

  } catch (error) {
    console.error('加载数据失败:', error);
    message.error('加载数据失败');
    timeSlots.value = [];
  } finally {
    loading.value = false; // 结束加载
  }
};

const saveData = async () => {
  try {
    const currentDate = getCurrentSelectedDate();

    // 准备要更新的数据
    const slotsToUpdate = statMode.value === 'week'
      ? timeSlots.value
      : timeSlots.value.filter(slot => slot.date === currentDate);

    const updateData = slotsToUpdate.map(slot => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      categoryId: slot.categoryId,
      title: slot.title,
      description: slot.description || '',
      color: slot.color,
      date: slot.date || currentDate
    }));

    // 调用批量更新接口
    await batchUpdate(updateData);
  } catch (error) {
    console.error('保存数据失败:', error);
  }
};

const resetData = async () => {
  const currentDate = getCurrentSelectedDate();

  if (statMode.value === 'week') {
    // 按周模式下，清除整周数据
    const promises = weekDays.value.map(day =>
      deleteByDate({date: day.date})
    );
    await Promise.all(promises);
  } else {
    // 按天模式下，清除当天数据
    await deleteByDate({date: currentDate});
  }

  timeSlots.value = [];
};

// 日期处理函数
const handleDateChange = () => {
  loadData();
};

const handleStatModeChange = () => {
  // 切换统计模式时重新加载数据
  selectedWeekDayIndex.value = 0; // 重置选中的星期几
  loadData();
};

const goToPreviousPeriod = () => {
  if (statMode.value === 'week') {
    // 按周模式下，往前移动一周
    selectedDate.value = selectedDate.value.subtract(1, 'week');
  } else {
    // 按天模式下，往前移动一天
    selectedDate.value = selectedDate.value.subtract(1, 'day');
  }
  loadData();
};

const goToNextPeriod = () => {
  if (statMode.value === 'week') {
    // 按周模式下，往后移动一周
    selectedDate.value = selectedDate.value.add(1, 'week');
  } else {
    // 按天模式下，往后移动一天
    selectedDate.value = selectedDate.value.add(1, 'day');
  }
  loadData();
};

// 选择星期几
const selectWeekDay = (index: number) => {
  selectedWeekDayIndex.value = index;
};

const disabledDate = (current: dayjs.Dayjs) => {
  // 可以禁用未来的日期，这里暂时不禁用任何日期
  return false;
};

// 当前时间更新器
let timeUpdater: number;
const startCurrentTimeUpdater = () => {
  const updateCurrentTime = () => {
    const now = new Date();
    currentTime.value = now.getHours() * 60 + now.getMinutes();
  };

  updateCurrentTime();
  timeUpdater = setInterval(updateCurrentTime, 60000) as unknown as number; // 每分钟更新一次
};

const stopCurrentTimeUpdater = () => {
  if (timeUpdater) {
    clearInterval(timeUpdater);
  }
};

// 样式计算
const getSlotStyle = (slot: TimeSlot) => {
  // 在按周统计模式下，使用固定的时间轴高度（800px - 60px的头部高度 = 740px）
  const timelineHeight = statMode.value === 'week' ? 740 : (timelineRef.value?.offsetHeight || 800);

  const { top, height } = getSlotPosition(slot, timelineHeight);
  const category = config.value.categories.find(cat => cat.id === slot.categoryId);

  return {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: category?.color || '#d9d9d9'
  };
};

const getDragPreviewStyle = () => {
  if (!dragOperation.value || !timelineRef.value) return {};

  const startTime = Math.min(dragOperation.value.startTime, dragOperation.value.currentTime);
  const endTime = Math.max(dragOperation.value.startTime, dragOperation.value.currentTime);
  const duration = endTime - startTime;

  if (duration < config.value.minSlotDuration) return {};

  const top = (startTime / 1440) * timelineRef.value.offsetHeight;
  const height = (duration / 1440) * timelineRef.value.offsetHeight;
  const category = config.value.categories.find(cat => cat.id === currentCategoryId.value);

  return {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: category?.color + '80' // 半透明
  };
};

// 事件处理函数
const handleTrackMouseDown = (event: MouseEvent) => {
  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const y = event.clientY - rect.top;
  const startTime = snapToGrid(getTimeFromPosition(y, timelineRef.value.offsetHeight));

  dragOperation.value = {
    type: 'create',
    startY: y,
    startTime,
    currentTime: startTime
  };
};

const handleTrackMouseMove = (event: MouseEvent) => {
  if (!dragOperation.value || !timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const y = event.clientY - rect.top;
  dragOperation.value.currentTime = snapToGrid(getTimeFromPosition(y, timelineRef.value.offsetHeight));

  // 处理时间段移动和调整大小
  if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    const deltaY = y - dragOperation.value.startY;
    const deltaTime = getTimeFromPosition(deltaY, timelineRef.value.offsetHeight);

    const slot = timeSlots.value.find(s => s.id === dragOperation.value!.slotId);
    if (!slot) return;

    if (dragOperation.value.type === 'move') {
      // 移动时间段
      const newStartTime = Math.max(0, Math.min(1440 - (slot.endTime - slot.startTime), dragOperation.value.startTime + deltaTime));
      const newEndTime = newStartTime + (slot.endTime - slot.startTime);

      // 检查下方时间段限制
      const movedSlot = { ...slot, startTime: newStartTime, endTime: newEndTime };
      const belowSlotStartTime = getBelowSlotStartTime(timeSlots.value, movedSlot, slot.id);

      // 如果下方有时间段，确保当前时间段不会与下方时间段重叠
      if (belowSlotStartTime !== null && newEndTime > belowSlotStartTime) {
        // 限制当前时间段的结束时间不能超过下方时间段的开始时间
        const maxEndTime = belowSlotStartTime;
        const maxStartTime = maxEndTime - (slot.endTime - slot.startTime);

        // 如果新的开始时间会导致重叠，则调整到最大允许位置
        if (newStartTime > maxStartTime) {
          movedSlot.startTime = maxStartTime;
          movedSlot.endTime = maxEndTime;
        }
      }

      // 检查是否重叠（排除自身）
      const otherSlots = timeSlots.value.filter(s => s.id !== slot.id);
      if (!hasOverlap(otherSlots, movedSlot)) {
        slot.startTime = movedSlot.startTime;
        slot.endTime = movedSlot.endTime;
      }
    } else if (dragOperation.value.type === 'resize') {
      // 调整时间段大小
      const newTime = Math.max(0, Math.min(1440, dragOperation.value.startTime + deltaTime));

      if (dragOperation.value.slotId) {
        const resizeSlot = timeSlots.value.find(s => s.id === dragOperation.value?.slotId);
        if (!resizeSlot) return;

        const originalStart = resizeSlot.startTime;
        const originalEnd = resizeSlot.endTime;

        if (dragOperation.value.startTime === originalStart) {
          // 调整顶部（开始时间）
          const minEndTime = originalStart + config.value.minSlotDuration;
          const newStartTime = Math.min(newTime, originalEnd - config.value.minSlotDuration);
          resizeSlot.startTime = Math.max(0, newStartTime);
        } else {
          // 调整底部（结束时间）
          const maxStartTime = originalEnd - config.value.minSlotDuration;
          const newEndTime = Math.max(newTime, originalStart + config.value.minSlotDuration);
          resizeSlot.endTime = Math.min(1440, newEndTime);
        }

        // 检查下方时间段限制（仅对调整底部有效）
        if (dragOperation.value.startTime === originalEnd) {
          const belowSlotStartTime = getBelowSlotStartTime(timeSlots.value, resizeSlot, resizeSlot.id);
          if (belowSlotStartTime !== null && resizeSlot.endTime > belowSlotStartTime) {
            // 限制当前时间段的结束时间不能超过下方时间段的开始时间
            resizeSlot.endTime = belowSlotStartTime;
          }
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
    console.log('startTime', startTime, 'endTime', endTime)
    const duration = endTime - startTime;

    if (duration >= config.value.minSlotDuration) {
      const newSlot: TimeSlot = {
        id: generateId(),
        startTime,
        endTime,
        categoryId: currentCategoryId.value,
        title: getCategoryName(currentCategoryId.value, config.value.categories),
        date: selectedDate.value.format('YYYY-MM-DD')
      };
      // 重叠的时候，取上方的最大值和下方的最小值
      timeSlots.value.forEach(slot => {
        // 打印slow.startTime的类型
        console.log(typeof slot.startTime);
        if (newSlot.startTime > slot.endTime || newSlot.endTime < slot.startTime) {
          console.log("不包含");
        } else if (newSlot.startTime <= slot.startTime && newSlot.endTime > slot.endTime) {
          console.log("全包含");
        } else if (newSlot.startTime <= slot.endTime && newSlot.endTime > slot.endTime) {
          newSlot.startTime = slot.endTime + 1
        } else if (newSlot.endTime > slot.startTime && newSlot.startTime < slot.startTime) {

          newSlot.endTime = slot.startTime - 1
        }
      });

      if (!hasOverlap(timeSlots.value, newSlot)) {
        timeSlots.value.push(newSlot);
        saveData();
      } else {
        // todo
        timeSlots.value.push(newSlot);
        saveData();
      }
    }
  } else if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    // 时间段移动或调整大小完成，保存数据
    saveData();
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
  const y = event.clientY - rect.top;

  dragOperation.value = {
    type: 'move',
    slotId: slot.id,
    startY: y,
    startTime: slot.startTime,
    currentTime: slot.startTime
  };
};

const handleResizeStart = (event: MouseEvent, slot: TimeSlot, direction: 'top' | 'bottom') => {
  event.stopPropagation();

  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const y = event.clientY - rect.top;

  dragOperation.value = {
    type: 'resize',
    slotId: slot.id,
    startY: y,
    startTime: direction === 'top' ? slot.startTime : slot.endTime,
    currentTime: direction === 'top' ? slot.startTime : slot.endTime
  };
};

const handleSlotClick = (slot: TimeSlot) => {
  if (dragOperation.value) return; // 防止拖拽后触发点击

  editingSlot.value = { ...slot };
  showEditModal.value = true;
};

// 计算智能开始时间
const calculateSmartStartTime = (): number => {
  const currentDate = getCurrentSelectedDate();

  // 获取当天的时间段，按开始时间排序
  const sameDaySlots = timeSlots.value
    .filter((slot: TimeSlot) => slot.date === currentDate)
    .sort((a: TimeSlot, b: TimeSlot) => a.startTime - b.startTime);

  // 如果没有时间段，从00:00开始
  if (sameDaySlots.length === 0) {
    return 0;
  }

  // 检查第一个时间段之前是否有足够的空间（从00:00开始）
  if (sameDaySlots[0].startTime >= 30) {
    return 0;
  }

  // 检查时间段之间的空隙
  for (let i = 0; i < sameDaySlots.length - 1; i++) {
    const currentSlot = sameDaySlots[i];
    const nextSlot = sameDaySlots[i + 1];

    // 计算当前时间段结束时间和下一个时间段开始时间之间的空隙大小
    const gapSize = nextSlot.startTime - currentSlot.endTime - 1;

    // 如果空隙足够容纳30分钟的时间段，或者空隙大于0（允许插入较短时间段）
    if (gapSize >= 30 || gapSize > 0) {
      return currentSlot.endTime + 1;
    }
  }

  // 检查最后一个时间段之后是否有足够的空间
  const lastSlot = sameDaySlots[sameDaySlots.length - 1];
  if (lastSlot.endTime + 30 <= 1440) {
    return lastSlot.endTime + 1;
  }

  // 如果没有足够的空间，返回当天最后一个时间段的结束时间 + 1分钟
  // 但确保不超过23:59
  return Math.min(lastSlot.endTime + 1, 1439);
};

const handleAddSlot = () => {
  const currentDate = getCurrentSelectedDate();

  // 获取当天的时间段，按开始时间排序
  const sameDaySlots = timeSlots.value
    .filter((slot: TimeSlot) => slot.date === currentDate)
    .sort((a: TimeSlot, b: TimeSlot) => a.startTime - b.startTime);

  // 计算智能开始时间
  const smartStartTime = calculateSmartStartTime();

  // 判断是否是今天
  const today = dayjs().format('YYYY-MM-DD');
  const isToday = currentDate === today;

  // 智能计算结束时间：找到下一个时间段的开始时间，或者默认30分钟
  // 如果是今天，最大结束时间设为当前时间；否则设为23:59（1439分钟）
  let endTime = Math.min(smartStartTime + 30, 1439);
  if (isToday) {
    // 当天直接取当前时间
    endTime = currentTime.value;
  }

  // 查找当前空隙的下一个时间段的开始时间
  const nextSlot = sameDaySlots.find(slot => slot.startTime > smartStartTime);
  if (nextSlot && nextSlot.startTime > smartStartTime) {
    // 如果空隙不足30分钟，设置结束时间为下一个时间段的开始时间
    const availableTime = nextSlot.startTime - smartStartTime - 1;
    if (availableTime < 30) {
      endTime = Math.min(smartStartTime + availableTime, maxEndTime);
    }
  }

  // 创建新的时间段对象
  const newSlot: TimeSlot = {
    id: generateId(),
    startTime: smartStartTime,
    endTime: endTime,
    categoryId: currentCategoryId.value,
    title: getCategoryName(currentCategoryId.value, config.value.categories),
    description: '',
    date: currentDate
  };

  editingSlot.value = newSlot;
  showEditModal.value = true;
};

const handleSaveSlot = (formData: any) => {
  const index = timeSlots.value.findIndex(slot => slot.id === formData.id);

  if (index !== -1) {
    // 编辑现有时间段
    const updatedSlot = { ...timeSlots.value[index], ...formData };

    // 如果用户没有修改标题，自动更新为分类名称
    if (updatedSlot.title === timeSlots.value[index].title) {
      updatedSlot.title = getCategoryName(updatedSlot.categoryId, config.value.categories);
    }

    // 检查重叠时，只考虑同一天内的时间段
      const sameDaySlots = timeSlots.value.filter(
        (slot: TimeSlot) => slot.date === updatedSlot.date && slot.id !== formData.id
      );

    if (isValidSlot(updatedSlot, config.value) && !hasOverlap(sameDaySlots, updatedSlot)) {
      timeSlots.value[index] = updatedSlot;
      update(updatedSlot).then(() => {
        showEditModal.value = false;
      }).catch(err => {
        console.error('更新失败:', err);
        message.error('更新失败');
      });
    } else {
      message.error('时间段无效或重叠');
    }
  } else {
    // 新增时间段
    const currentDate = getCurrentSelectedDate();

    const newSlot: TimeSlot = {
      id: formData.id,
      startTime: formData.startTime,
      endTime: formData.endTime,
      categoryId: formData.categoryId,
      title: formData.title,
      description: formData.description || '',
      date: currentDate
    };

    // 如果用户没有修改标题，自动设置为分类名称
    if (!newSlot.title || newSlot.title === '') {
      newSlot.title = getCategoryName(newSlot.categoryId, config.value.categories);
    }

    // 检查重叠时，只考虑同一天内的时间段
    const sameDaySlots = timeSlots.value.filter((slot: TimeSlot) => slot.date === currentDate);

    if (isValidSlot(newSlot, config.value) && !hasOverlap(sameDaySlots, newSlot)) {
      timeSlots.value.push(newSlot);
      saveData();
      showEditModal.value = false;
    } else {
      message.error('时间段无效或重叠');
    }
  }
};

const handleDeleteSlot = (slotId: string) => {
  timeSlots.value = timeSlots.value.filter(slot => slot.id !== slotId);
  saveData();
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

// 获取某天的时间段数据
const getDaySlots = (date: string): TimeSlot[] => {
  return timeSlots.value.filter((slot: TimeSlot) => slot.date === date);
};

// 复制上一天数据
const copyPreviousDayData = async () => {
  try {
    loading.value = true;

    // 获取昨天的日期
    const yesterday = selectedDate.value.subtract(1, 'day');
    const yesterdayDate = yesterday.format('YYYY-MM-DD');

    // 查询昨天的数据
    const response = await query({ condition: { date: yesterdayDate } });

    if (response.items && response.items.length > 0) {
      // 复制数据并生成新的ID，更新日期为今天
      const todayDate = selectedDate.value.format('YYYY-MM-DD');
      const copiedSlots = response.items.map(slot => ({
        ...slot,
        id: generateId(),
        date: todayDate
      }));

      // 设置当前数据为复制后的数据
      timeSlots.value = copiedSlots;

      // 保存数据
      await saveData();

      message.success(`成功复制${yesterdayDate}的数据到${todayDate}`);
    } else {
      message.warning(`${yesterdayDate}没有数据可复制`);
    }
  } catch (error) {
    console.error('复制数据失败:', error);
    message.error('复制数据失败');
  } finally {
    loading.value = false;
  }
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

.header-left {
  display: flex;
  align-items: center;
}

.header-left .ant-radio-group {
  margin-right: 10px;
}

.header h2 {
  margin: 0;
  color: #262626;
}

.date-picker-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 35px;
}

.date-picker-label {
  font-weight: 500;
  color: #595959;
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
  height: 800px; /* 设置固定高度 */
  display: flex;
}

/* 按周统计样式 */
.week-timeline-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 800px;
}

.week-header {
  display: flex;
  height: 60px;
  border-bottom: 1px solid #d9d9d9;
  background: #fafafa;
}

.time-scale-header {
  width: 45px;
  border-right: 1px solid #d9d9d9;
  flex-shrink: 0;
}

.week-day-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-right: 1px solid #d9d9d9;
  transition: background-color 0.2s;
}

.week-day-header:hover {
  background: #f0f0f0;
}

.week-day-header.active {
  background: #e6f7ff;
  font-weight: 500;
}

.day-name {
  font-size: 14px;
  color: #262626;
  margin-bottom: 4px;
}

.day-date {
  font-size: 12px;
  color: #8c8c8c;
}

.week-timeline-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.week-days-container {
  flex: 1;
  display: flex;
  overflow-x: auto;
}

.week-day-track {
  flex: 1;
  position: relative;
  background: #f8f9fa;
  border-right: 1px solid #d9d9d9;
  min-width: 150px;
}

/* 调整时间槽在周视图中的样式 */
.week-day-track .time-slot {
  left: 5px;
  width: calc(100% - 10px);
}

.week-day-track .slot-content {
  padding: 4px;
}

.week-day-track .slot-title {
  font-size: 12px;
  line-height: 1.2;
}

.time-scale {
  position: relative;
  width: 60px;
  background: #fafafa;
  border-right: 1px solid #d9d9d9;
  flex-shrink: 0;
}

.hour-marker {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
  background: #d9d9d9;
}

.hour-label {
  position: absolute;
  top: -8px;
  left: 5px;
  font-size: 12px;
  color: #8c8c8c;
}

.timeline-track {
  position: relative;
  flex: 1;
  background: #f8f9fa;
  cursor: crosshair;
  user-select: none;
}

.time-slot {
  position: absolute;
  left: 10px;
  width: calc(100% - 20px);
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s;
  border: 1px solid white;
}

.time-slot:hover {
  border-color: rgba(0, 0, 0, 0.3);
  transform: translateX(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.slot-content {
  padding: 8px;
  height: 100%;
  display: flex;
  align-items: center;
  color: white;
  font-weight: 500;
}

.slot-info {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 8px;
}

.slot-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-time {
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
}

.resize-handle {
  position: absolute;
  left: 0;
  height: 6px;
  width: 100%;
  cursor: row-resize;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-handle.top {
  top: 0;
}

.resize-handle.bottom {
  bottom: 0;
}

.time-slot:hover .resize-handle {
  opacity: 1;
  background: rgba(255, 255, 255, 0.5);
}

.drag-preview {
  position: absolute;
  left: 10px;
  width: calc(100% - 20px);
  border: 2px dashed rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  pointer-events: none;
}



.statistics {
  margin-top: 20px;
}

.stats-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stats-card {
  min-width: 300px;
  flex: 1;
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

.pie-chart-card {
  min-width: 400px;
  flex: 2;
}
</style>
