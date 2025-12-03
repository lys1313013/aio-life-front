<template>
  <div class="time-tracker">
    <!-- 标题和操作栏 -->
    <div class="header">
      <div class="header-right">
        <!-- 按钮区 -->
        <div class="actions">
          <Popover placement="bottom">
            <template #content>
              <div class="category-popover">
                <div class="category-list">
                  <Button
                    v-for="category in config.categories"
                    :key="category.id"
                    :type="currentCategoryId === category.id ? 'primary' : 'default'"
                    @click="currentCategoryId = category.id"
                    :style="{ borderColor: category.color }"
                    :disabled="loading"
                    :size="isMobile ? 'small' : 'middle'"
                  >
                    <div class="category-button-content">
                      <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
                      {{ category.name }}
                    </div>
                  </Button>
                </div>
              </div>
            </template>
            <Button type="default" :disabled="loading" :size="isMobile ? 'small' : 'middle'">
              <template #icon><TagOutlined /></template>
            </Button>
          </Popover>
          <Button type="primary" @click="showCategoryModal = true" :disabled="loading" :size="isMobile ? 'small' : 'middle'">
            <template #icon><SettingOutlined /></template>
          </Button>
          <Button type="primary" danger @click="openDeleteConfirmModal" :disabled="loading" :size="isMobile ? 'small' : 'middle'">
            <template #icon><DeleteOutlined /></template>
          </Button>
          <CategoryFilter
            :categories="config.categories"
            :loading="loading"
            :size="isMobile ? 'small' : 'middle'"
            @filterChange="handleFilterChange"
          />
        </div>
        <!-- 日期切换区 -->
        <div class="date-picker-container">
          <Button
            type="default"
            @click="goToPreviousPeriod"
            :disabled="loading"
            class="date-nav-button"
            :size="isMobile ? 'small' : 'middle'"
          >
            <template #icon><LeftOutlined /></template>
          </Button>
          <div class="date-picker-wrapper">
            <span class="date-text">{{ selectedDate.format('YYYY-MM-DD') }}</span>
            <DatePicker
              class="hidden-date-picker"
              v-model:value="selectedDate"
              format="YYYY-MM-DD"
              :allowClear="false"
              @change="handleDateChange"
              :disabled-date="disabledDate"
              :disabled="loading"
              :size="isMobile ? 'small' : 'middle'"
            >
              <template #suffixIcon></template>
            </DatePicker>
          </div>
          <Button
            type="default"
            @click="goToNextPeriod"
            :disabled="loading"
            class="date-nav-button"
            :size="isMobile ? 'small' : 'middle'"
          >
            <template #icon><RightOutlined /></template>
          </Button>
        </div>
        <!-- 日周月切换区 -->
        <Radio.Group v-model:value="statMode" @change="handleStatModeChange" :disabled="loading" :size="isMobile ? 'small' : 'default'">
          <Radio.Button value="day">日</Radio.Button>
          <Radio.Button value="week">周</Radio.Button>
          <Radio.Button value="month">月</Radio.Button>
        </Radio.Group>
      </div>
    </div>

    <div class="content-layout">
      <div class="left-panel">
        <Spin :spinning="loading" :size="isMobile ? 'small' : 'large'">
          <template v-if="statMode === 'week'">
            <div class="week-timeline-container" ref="weekTimelineContainerRef" :style="isMobile ? { height: mobileTimelineHeight + 'px' } : {}">
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

              <div class="week-timeline-wrapper">
                <div class="time-scale">
                  <div
                    v-for="hour in 24"
                    :key="hour"
                    class="hour-marker"
                    :style="{ top: `${(hour / 24) * 100}%` }"
                  >
                    <span class="hour-label" v-if="hour < 24">{{ hour.toString().padStart(2, '0') }}:00</span>
                  </div>
                </div>

                <div class="week-days-container" @touchend="handleTrackPointerUp" @touchcancel="handleTrackPointerLeave">
                  <div
                    v-for="(day, index) in weekDays"
                    :key="index"
                    class="week-day-track"
                  >
                    <div
                      v-for="slot in getDaySlots(day.date)"
                      :key="slot.id"
                      class="time-slot"
                      :style="{ ...getSlotStyle(slot), pointerEvents: loading ? 'none' : 'auto' }"
                      @mousedown="handleSlotPointerDown($event, slot)"
                      @touchstart="handleSlotPointerDown($event, slot)"
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

          <template v-else-if="statMode === 'month'">
            <div class="month-timeline-container" ref="monthTimelineContainerRef" :style="isMobile ? { height: mobileTimelineHeight + 'px', '--month-day-count': monthDays.length } : { '--month-day-count': monthDays.length }">
              <div class="month-header" ref="monthHeaderRef">
                <div class="time-scale-header"></div>
                <div
                  v-for="(day, index) in monthDays"
                  :key="index"
                  class="month-day-header"
                  @click="selectMonthDay(index)"
                  :class="{ active: selectedMonthDayIndex === index }"
                >
                  <div class="day-name">{{ day.weekday }}</div>
                  <div class="day-date">{{ day.date }}</div>
                </div>
              </div>

              <div class="month-timeline-wrapper">
                <div class="time-scale">
                  <div
                    v-for="hour in 24"
                    :key="hour"
                    class="hour-marker"
                    :style="{ top: `${(hour / 24) * 100}%` }"
                  >
                    <span class="hour-label" v-if="hour < 24">{{ hour.toString().padStart(2, '0') }}:00</span>
                  </div>
                </div>

                <div class="month-days-container" ref="monthDaysContainerRef" @scroll="syncMonthScroll">
                  <div
                    v-for="(day, index) in monthDays"
                    :key="index"
                    class="month-day-track"
                  >
                    <div
                      v-for="slot in getDaySlots(day.date)"
                      :key="slot.id"
                      class="time-slot"
                      :style="{ ...getSlotStyle(slot), pointerEvents: loading ? 'none' : 'auto' }"
                      @mousedown="handleSlotPointerDown($event, slot)"
                      @touchstart="handleSlotPointerDown($event, slot)"
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

          <template v-else>
            <div class="timeline-container" ref="timelineContainerRef" :style="isMobile ? { height: mobileTimelineHeight + 'px' } : {}">
              <div class="time-scale">
                <div
                  v-for="hour in 24"
                  :key="hour"
                  class="hour-marker"
                  :style="{ top: `${(hour / 24) * 100}%` }"
                >
                  <span class="hour-label" v-if="hour < 24">{{ hour.toString().padStart(2, '0') }}:00</span>
                </div>
              </div>

              <div
                ref="timelineRef"
                class="timeline-track"
                @mousedown="handleTrackPointerDown"
                @mousemove="handleTrackPointerMove"
                @mouseup="handleTrackPointerUp"
                @mouseleave="handleTrackPointerLeave"
                @touchstart="handleTrackPointerDown"
                @touchmove.prevent="handleTrackPointerMove"
                @touchend="handleTrackPointerUp"
                @touchcancel="handleTrackPointerLeave"
                :style="{ cursor: loading ? 'not-allowed' : (isMobile ? 'default' : 'crosshair') }"
              >
              <div
                v-for="slot in timeSlots"
                :key="slot.id"
                class="time-slot"
                :style="{ ...getSlotStyle(slot), pointerEvents: loading ? 'none' : 'auto' }"
                @mousedown="handleSlotPointerDown($event, slot)"
                @touchstart="handleSlotPointerDown($event, slot)"
                @click="handleSlotClick(slot)"
              >
                <div class="slot-content">
                  <div class="slot-info">
                    <span class="slot-title">{{ slot.title }}</span>
                    <span class="slot-time">{{ formatSlotTime(slot) }}</span>
                  </div>
                </div>
                <div class="resize-handle top" @mousedown="handleResizeStartPointer($event, slot, 'top')" @touchstart="handleResizeStartPointer($event, slot, 'top')"></div>
                <div class="resize-handle bottom" @mousedown="handleResizeStartPointer($event, slot, 'bottom')" @touchstart="handleResizeStartPointer($event, slot, 'bottom')"></div>
              </div>
              <div
                v-if="dragOperation"
                class="drag-preview"
                :style="getDragPreviewStyle()"
              ></div>
            </div>
          </div>
          </template>
        </Spin>
      </div>
      <div class="right-panel">
        <div>
          <div class="stats-row">
            <!-- 在周/月视图且有分类筛选时显示每日分类柱状图 -->
            <DailyCategoryBarChart
              v-if="(statMode === 'week' || statMode === 'month') && selectedFilterCategoryId"
              :time-slots="timeSlots"
              :categories="config.categories"
              :selected-date="selectedDate"
              :stat-mode="statMode"
              :selected-filter-category-id="selectedFilterCategoryId"
            />
            <!-- 默认显示分类柱状图 -->
            <TimeCategoryBarChart
              v-if="!selectedFilterCategoryId || statMode === 'day'"
              :time-slots="timeSlots"
              :categories="config.categories"
              :selected-date="selectedDate"
            />
            <DailyStatsPieChart
              v-if="(statMode === 'week' || statMode === 'month') && selectedFilterCategoryId"
              :time-slots="timeSlots"
              :categories="config.categories"
              :selected-date="selectedDate"
              :stat-mode="statMode"
              :selected-filter-category-id="selectedFilterCategoryId"
            />
            <TimeCategoryPieChart
              v-if="statMode === 'day' || !selectedFilterCategoryId"
              :time-slots="timeSlots"
              :categories="config.categories"
              :selected-date="selectedDate"
            />
            <div class="stats-cards-group">
              <div class="stat-square-card">
                <span class="stat-label-corner">总计</span>
                <span class="stat-value-center">{{ filteredTimeSlots.length }}</span>
              </div>
              <div class="stat-square-card">
                <span class="stat-label-corner">时长</span>
                <span class="stat-value-center">{{ formatDuration(totalDuration) }}</span>
              </div>
              <div class="stat-square-card" v-if="(statMode === 'week' || statMode === 'month') && selectedFilterCategoryId">
                <span class="stat-label-corner">平均</span>
                <span class="stat-value-center">{{ formatDuration(Math.round(averageDuration)) }}</span>
              </div>
              <div class="stat-square-card" v-if="!selectedFilterCategoryId" :style="freeTimeCardStyle">
                <span class="stat-label-corner">空闲</span>
                <span class="stat-value-center">{{ formatDuration(freeTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isMobile" class="floating-add-button mobile">
      <Button
        type="primary"
        shape="circle"
        @click="handleAddSlot"
        :disabled="loading"
        :size="'large'"
        class="add-button"
      >
        <template #icon><PlusOutlined /></template>
      </Button>
    </div>
    <div v-else class="floating-btn" @click="handleAddSlot">
      <PlusOutlined style="font-size: 24px; color: white" />
    </div>

    <!-- 时间段编辑模态框 -->
    <Modal
      v-model:open="showEditModal"
      :title="editModalTitle"
      :width="isMobile ? '95vw' : 600"
      :footer="null"
      @cancel="handleEditCancel"
    >
      <TimeSlotEditForm
        v-if="editingSlot"
        :slot="editingSlot"
        :categories="config.categories"
        :existing-slots="timeSlots"
        @save="handleSaveSlot"
        @delete="handleDeleteSlot"
        @cancel="handleEditCancel"
      />
    </Modal>

    <!-- 分类管理模态框 -->
    <Modal
      v-model:open="showCategoryModal"
      title="分类管理"
      :width="isMobile ? '95vw' : 800"
      :footer="null"
    >
      <CategoryManager
        :categories="config.categories"
        @update="handleCategoriesUpdate"
      />
    </Modal>

    <!-- 删除确认弹窗 -->
    <Modal
      v-model:open="showDeleteConfirmModal"
      title="确认删除"
      :width="isMobile ? '95vw' : 400"
      :mask-closable="false"
      @ok="confirmResetData"
      @cancel="cancelDelete"
    >
      <div style="text-align: center; padding: 20px 0;">
        <p style="font-size: 16px; margin-bottom: 10px;">确定要删除当前数据吗？</p>
        <p style="color: #ff4d4f; font-size: 14px;">此操作不可恢复，请谨慎操作！</p>
      </div>
      <template #footer>
        <div style="text-align: center;">
          <Button @click="cancelDelete" :disabled="loading">取消</Button>
          <Button type="primary" danger @click="confirmResetData" :loading="loading">确认删除</Button>
        </div>
      </template>
    </Modal>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { SettingOutlined, PlusOutlined, LeftOutlined, RightOutlined, DeleteOutlined, TagOutlined } from '@ant-design/icons-vue';
import { Button, Card, Modal, message, DatePicker, Spin, Radio, Popover, theme } from 'ant-design-vue';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

// 扩展dayjs插件
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
import type { TimeSlot, TimeSlotCategory, DragOperation } from './types';

const { useToken } = theme;
const { token } = useToken();

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
  getBelowSlotStartTime,
  getAboveSlotEndTime
} from './utils';
import TimeSlotEditForm from './components/TimeSlotEditForm.vue';
import CategoryManager from './components/CategoryManager.vue';
import TimeCategoryPieChart from './components/TimeCategoryPieChart.vue';
import TimeCategoryBarChart from './components/TimeCategoryBarChart.vue';
import DailyCategoryBarChart from './components/DailyCategoryBarChart.vue';
import DailyStatsPieChart from './components/DailyStatsPieChart.vue';
import CategoryFilter from './components/CategoryFilter.vue';
import { query, queryForWeek, update, save, deleteByDate, deleteData, recommendType } from '#/api/core/time-tracker';

// 响应式数据
const timelineRef = ref<HTMLElement>();
const timelineContainerRef = ref<HTMLElement>();
const weekTimelineContainerRef = ref<HTMLElement>();
const monthTimelineContainerRef = ref<HTMLElement>();
const monthHeaderRef = ref<HTMLElement>();
const monthDaysContainerRef = ref<HTMLElement>();
const mobileTimelineHeight = ref<number>(800);
const timeSlots = ref<TimeSlot[]>([]);
const currentCategoryId = ref(defaultConfig.defaultCategoryId);
const dragOperation = ref<DragOperation | null>(null);
const selectedFilterCategoryId = ref<string | null>(null);
const showEditModal = ref(false);
const showCategoryModal = ref(false);
const editingSlot = ref<TimeSlot | null>(null);
const currentTime = ref(0);
const selectedDate = ref(dayjs());
const loading = ref(false);
const statMode = ref<'day' | 'week' | 'month'>('day');
const selectedWeekDayIndex = ref(0);
const selectedMonthDayIndex = ref(0);
const isMobile = ref(false);

// 确认弹窗状态
const showDeleteConfirmModal = ref(false);

// 配置
const config = ref(defaultConfig);

// 计算属性
// 筛选后的时间槽
const filteredTimeSlots = computed(() => {
  if (!selectedFilterCategoryId.value) {
    return timeSlots.value;
  }
  return timeSlots.value.filter(slot => slot.categoryId === selectedFilterCategoryId.value);
});

const totalDuration = computed(() => {
  return filteredTimeSlots.value.reduce((total, slot) => total + (slot.endTime - slot.startTime + 1), 0);
});

const averageDuration = computed(() => {
  // 计算分母：当前视图范围内，实际有数据记录的天数（不区分分类）
  // 比如：这个月录了3天数据，其中2天有筛选中分类的数据，分母应该是3
  const activeDates = new Set(timeSlots.value.map(slot => slot.date));
  const activeDaysCount = activeDates.size;

  if (activeDaysCount === 0) {
    return 0;
  }

  return totalDuration.value / activeDaysCount;
});

const maxDuration = computed(() => {
  if (statMode.value === 'week') {
    return 7 * 1440;
  }
  if (statMode.value === 'month') {
    return selectedDate.value.daysInMonth() * 1440;
  }
  return 1440;
});

// 计算空闲时间
const freeTime = computed(() => {
  const ft = maxDuration.value - totalDuration.value;
  return Math.max(0, ft);
});

const freeTimeCardStyle = computed(() => {
  // 1. 计算每个分类的总时长
  const categoryDurations = new Map<string, number>();
  filteredTimeSlots.value.forEach(slot => {
    const duration = slot.endTime - slot.startTime;
    const current = categoryDurations.get(slot.categoryId) || 0;
    categoryDurations.set(slot.categoryId, current + duration);
  });

  // 2. 转换为数组并按时长降序排序
  const sortedCategories = Array.from(categoryDurations.entries())
    .map(([id, duration]) => {
      const category = config.value.categories.find(c => c.id === id);
      return {
        id,
        duration,
        color: category?.color || '#d9d9d9',
        name: category?.name
      };
    })
    .sort((a, b) => b.duration - a.duration);

  // 3. 构建渐变样式
  if (sortedCategories.length === 0) {
    return {};
  }

  const gradientStops: string[] = [];
  let currentPercent = 0;
  const totalMax = maxDuration.value || 1440;

  // 辅助函数：将 hex 颜色转换为 rgba，并指定透明度
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  sortedCategories.forEach(item => {
    const percent = (item.duration / totalMax) * 100;
    const start = currentPercent;
    const end = Math.min(100, currentPercent + percent);
    const color = item.color.startsWith('#') ? hexToRgba(item.color, 0.6) : item.color; // 降低透明度

    // 只有当该段长度足够时，才显示分割线，避免渲染错误
    const gap = 0.5;
    if (percent > gap) {
      gradientStops.push(`${color} ${start.toFixed(2)}%`);
      gradientStops.push(`${color} ${(end - gap).toFixed(2)}%`);
      gradientStops.push(`rgba(255,255,255,0.5) ${(end - gap).toFixed(2)}%`); // 分割线开始
      gradientStops.push(`rgba(255,255,255,0.5) ${end.toFixed(2)}%`); // 分割线结束
    } else {
      // 长度不够，直接纯色填充
      gradientStops.push(`${color} ${start.toFixed(2)}%`);
      gradientStops.push(`${color} ${end.toFixed(2)}%`);
    }

    currentPercent = end;
  });

  // 填充剩余部分为带纹理的白色背景
  if (currentPercent < 100) {
    gradientStops.push(`rgba(255,255,255,0.9) ${currentPercent.toFixed(2)}%`);
    gradientStops.push(`rgba(255,255,255,0.9) 100%`);
  }

  return {
    backgroundImage: `linear-gradient(to top, ${gradientStops.join(', ')})`,
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#fff'
  };
});

// 计算当前周的所有日期
const weekDays = computed(() => {
  const currentDay = selectedDate.value;
  const startOfWeek = currentDay.startOf('isoWeek'); // 周一为一周的开始
  const days = [];

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

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

const monthDays = computed(() => {
  const currentDay = selectedDate.value;
  const startOfMonth = currentDay.startOf('month');
  const endOfMonth = currentDay.endOf('month');
  const days: Array<{ date: string; weekday: string; dayjs: any }> = [];
  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
  let iter = startOfMonth;
  while (iter.isBefore(endOfMonth) || iter.isSame(endOfMonth, 'day')) {
    const weekdayIndex = iter.isoWeekday() - 1;
    days.push({
      date: iter.format('YYYY-MM-DD'),
      weekday: weekdays[weekdayIndex] || '',
      dayjs: iter
    });
    iter = iter.add(1, 'day');
  }
  return days;
});



// 获取当前选中日期
const getCurrentSelectedDate = () => {
  if (statMode.value === 'week') {
    return weekDays.value[selectedWeekDayIndex.value]?.date || selectedDate.value.format('YYYY-MM-DD');
  }
  if (statMode.value === 'month') {
    return monthDays.value[selectedMonthDayIndex.value]?.date || selectedDate.value.format('YYYY-MM-DD');
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
  updateIsMobile();
  window.addEventListener('resize', updateIsMobile);
  window.addEventListener('resize', updateMobileTimelineHeight);
  nextTick(() => updateMobileTimelineHeight());
});

onUnmounted(() => {
  stopCurrentTimeUpdater();
  window.removeEventListener('resize', updateIsMobile);
  window.removeEventListener('resize', updateMobileTimelineHeight);
});

// 数据管理
const loadData = async () => {
  try {
    loading.value = true; // 开始加载

    let response;

    if (statMode.value === 'week' || statMode.value === 'month') {
      const daysValue = statMode.value === 'week' ? weekDays.value : monthDays.value;
      const startDate = daysValue.length > 0 ? daysValue[0]?.date || '' : '';
      const endDate = daysValue.length > 0 ? daysValue[daysValue.length - 1]?.date || '' : '';
      const queryParams = { condition: { startDate, endDate } };

      response = await queryForWeek(queryParams);

      // 确保返回的数据是数组格式
      if (Array.isArray(response)) {
        timeSlots.value = response;
      } else if (response && (response as any).items) {
        // 如果返回的是QueryResponse格式，提取items
        timeSlots.value = (response as any).items || [];
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

// 打开删除确认弹窗
const openDeleteConfirmModal = () => {
  showDeleteConfirmModal.value = true;
};

// 确认删除数据
const confirmResetData = async () => {
  try {
    loading.value = true;
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
    message.success('数据删除成功');
  } catch (error) {
    console.error('删除数据失败:', error);
    message.error('删除数据失败');
  } finally {
    loading.value = false;
    showDeleteConfirmModal.value = false;
  }
};

// 取消删除
const cancelDelete = () => {
  showDeleteConfirmModal.value = false;
};

// 日期处理函数
const handleFilterChange = (categoryId: string | null) => {
  selectedFilterCategoryId.value = categoryId;
};

const handleDateChange = () => {
  loadData();
};

const handleStatModeChange = () => {
  // 切换统计模式时重新加载数据
  selectedWeekDayIndex.value = 0;
  selectedMonthDayIndex.value = 0;
  loadData();
  nextTick(() => updateMobileTimelineHeight());
};

const goToPreviousPeriod = () => {
  if (statMode.value === 'week') {
    selectedDate.value = selectedDate.value.subtract(1, 'week');
  } else if (statMode.value === 'month') {
    selectedDate.value = selectedDate.value.subtract(1, 'month');
  } else {
    selectedDate.value = selectedDate.value.subtract(1, 'day');
  }
  loadData();
};

const goToNextPeriod = () => {
  if (statMode.value === 'week') {
    selectedDate.value = selectedDate.value.add(1, 'week');
  } else if (statMode.value === 'month') {
    selectedDate.value = selectedDate.value.add(1, 'month');
  } else {
    selectedDate.value = selectedDate.value.add(1, 'day');
  }
  loadData();
};

// 选择星期几
const selectWeekDay = (index: number) => {
  selectedWeekDayIndex.value = index;
};

const selectMonthDay = (index: number) => {
  selectedMonthDayIndex.value = index;
};

const disabledDate = (_current: dayjs.Dayjs) => {
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

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
  nextTick(() => updateMobileTimelineHeight());
};

const syncMonthScroll = () => {
  if (monthHeaderRef.value && monthDaysContainerRef.value) {
    monthHeaderRef.value.scrollLeft = monthDaysContainerRef.value.scrollLeft;
  }
};

// 计算手机端可用高度
const updateMobileTimelineHeight = () => {
  if (!isMobile.value) return;
  const containerEl = statMode.value === 'week' ? weekTimelineContainerRef.value : (statMode.value === 'month' ? monthTimelineContainerRef.value : timelineContainerRef.value);
  if (!containerEl) return;
  const rect = containerEl.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const available = Math.max(300, viewportHeight - rect.top);
  mobileTimelineHeight.value = available;
};
// 样式计算
const getSlotStyle = (slot: TimeSlot) => {
  const weekContainer = document.querySelector('.week-days-container') as HTMLElement | null;
  const monthContainer = document.querySelector('.month-days-container') as HTMLElement | null;
  const timelineHeight = statMode.value === 'week'
    ? (weekContainer?.offsetHeight || 740)
    : statMode.value === 'month'
    ? (monthContainer?.offsetHeight || 740)
    : (timelineRef.value?.offsetHeight || 800);

  const { top, height } = getSlotPosition(slot, timelineHeight);
  const category = config.value.categories.find(cat => cat.id === slot.categoryId);

  // 高亮显示选中的分类
  const isHighlighted = selectedFilterCategoryId.value
    ? slot.categoryId === selectedFilterCategoryId.value
    : false;

  // 判断是否是未来的时间段
  const today = dayjs().format('YYYY-MM-DD');
  const isFuture = slot.date > today || (slot.date === today && slot.startTime > currentTime.value);

  const style: any = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: category?.color || '#d9d9d9',
    opacity: selectedFilterCategoryId.value && !isHighlighted ? 0.3 : 1,
    zIndex: isHighlighted ? 10 : 1
  };

  if (isHighlighted) {
    style.border = isFuture ? '2px dashed #1890ff' : '2px solid #1890ff';
    style.boxShadow = '0 0 8px rgba(24, 144, 255, 0.5)';
  } else {
    style.border = isFuture ? '2px dashed #fff' : 'none';
    style.boxShadow = 'none';
  }

  if (isFuture) {
    // 添加点状填充效果
    style.backgroundImage = 'radial-gradient(rgba(255, 255, 255, 0.3) 1.5px, transparent 1.5px)';
    style.backgroundSize = '6px 6px';
  }

  return style;
};

const getDragPreviewStyle = () => {
  if (!dragOperation.value || !timelineRef.value) return {};

  const startTime = Math.min(
    dragOperation.value.startTime,
    dragOperation.value.currentTime,
  );
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
const getClientY = (event: MouseEvent | TouchEvent) => {
  if ('touches' in event && event.touches.length > 0) {
    return event.touches[0]?.clientY || 0;
  }
  if ('changedTouches' in event && event.changedTouches.length > 0) {
    return event.changedTouches[0]?.clientY || 0;
  }
  return (event as MouseEvent).clientY || 0;
};

const handleTrackPointerDown = (event: MouseEvent | TouchEvent) => {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const y = getClientY(event) - rect.top;
  const startTime = Math.min(1439, snapToGrid(getTimeFromPosition(y, timelineRef.value.offsetHeight)));
  dragOperation.value = { type: 'create', startY: y, startTime, currentTime: startTime };
};

const handleTrackPointerMove = (event: MouseEvent | TouchEvent) => {
  if (!dragOperation.value || !timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const y = getClientY(event) - rect.top;
  dragOperation.value.currentTime = Math.min(1439, snapToGrid(getTimeFromPosition(y, timelineRef.value.offsetHeight)));

  // 处理时间段移动和调整大小
  if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    const deltaY = y - dragOperation.value.startY;
    const deltaTime = getTimeFromPosition(deltaY, timelineRef.value.offsetHeight);

    const slot = timeSlots.value.find(s => s.id === dragOperation.value!.slotId);
    if (!slot) return;

    if (dragOperation.value.type === 'move') {
      // 移动时间段
      const newStartTime = Math.max(0, Math.min(1439 - (slot.endTime - slot.startTime), dragOperation.value.startTime + deltaTime));
      const newEndTime = newStartTime + (slot.endTime - slot.startTime);

      // 检查下方时间段限制
      const movedSlot = { ...slot, startTime: newStartTime, endTime: newEndTime };
      const belowSlotStartTime = getBelowSlotStartTime(timeSlots.value, movedSlot, slot.id);

      // 检查上方时间段限制：必须比上方结束时间大1分钟
      const aboveSlotEndTime = getAboveSlotEndTime(timeSlots.value, movedSlot, slot.id);
      if (aboveSlotEndTime !== null && movedSlot.startTime <= aboveSlotEndTime) {
        const duration = slot.endTime - slot.startTime;
        const minStartTime = aboveSlotEndTime + 1;
        movedSlot.startTime = Math.max(minStartTime, movedSlot.startTime);
        movedSlot.endTime = movedSlot.startTime + duration;
      }

      // 如果下方有时间段，确保当前时间段不会与下方时间段重叠
      if (belowSlotStartTime !== null && movedSlot.endTime > belowSlotStartTime) {
        // 限制当前时间段的结束时间不能超过下方时间段的开始时间
        const maxEndTime = belowSlotStartTime;
        const maxStartTime = maxEndTime - (slot.endTime - slot.startTime);

        // 如果新的开始时间会导致重叠，则调整到最大允许位置
        if (movedSlot.startTime > maxStartTime) {
          movedSlot.startTime = maxStartTime;
          movedSlot.endTime = maxEndTime;
        }
      }

      // 检查是否重叠（排除自身）
      const otherSlots = timeSlots.value.filter(s => s.id !== slot.id);
      if (!hasOverlap(otherSlots, movedSlot)) {
        slot.startTime = movedSlot.startTime;
        slot.endTime = movedSlot.endTime;
        if (dragOperation.value) {
          dragOperation.value.changed = (dragOperation.value.originalStart !== slot.startTime) || (dragOperation.value.originalEnd !== slot.endTime);
        }
      }
    } else if (dragOperation.value.type === 'resize') {
      const newTime = Math.max(0, Math.min(1439, dragOperation.value.startTime + deltaTime));

      if (dragOperation.value.slotId) {
        const resizeSlot = timeSlots.value.find(s => s.id === dragOperation.value?.slotId);
        if (!resizeSlot) return;

        const originalStart = resizeSlot.startTime;
        const originalEnd = resizeSlot.endTime;

        if (dragOperation.value.direction === 'top') {
          const newStartTime = Math.min(newTime, originalEnd - config.value.minSlotDuration);
          resizeSlot.startTime = Math.max(0, newStartTime);
          const aboveSlots = timeSlots.value
            .filter(s => s.id !== resizeSlot.id && s.date === resizeSlot.date && s.endTime <= originalStart)
            .sort((a, b) => b.endTime - a.endTime);
          if (aboveSlots.length > 0 && aboveSlots[0] && resizeSlot.startTime <= aboveSlots[0].endTime) {
            resizeSlot.startTime = aboveSlots[0].endTime + 1;
          }
        } else {
          const newEndTime = Math.max(newTime, originalStart + config.value.minSlotDuration);
          resizeSlot.endTime = Math.min(1439, newEndTime);
        }

        if (dragOperation.value.direction === 'bottom') {
          const belowSlotStartTime = getBelowSlotStartTime(timeSlots.value, resizeSlot, resizeSlot.id);
          if (belowSlotStartTime !== null && resizeSlot.endTime > belowSlotStartTime) {
            resizeSlot.endTime = belowSlotStartTime;
          }
        }

        const otherSlots = timeSlots.value.filter(s => s.id !== resizeSlot.id);
        if (hasOverlap(otherSlots, resizeSlot)) {
          resizeSlot.startTime = originalStart;
          resizeSlot.endTime = originalEnd;
          if (dragOperation.value) {
            dragOperation.value.changed = false;
          }
        }
        if (dragOperation.value) {
          dragOperation.value.changed = dragOperation.value.changed || (dragOperation.value.originalStart !== resizeSlot.startTime) || (dragOperation.value.originalEnd !== resizeSlot.endTime);
        }
      }
    }
  }
};

const handleTrackPointerUp = async () => {
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
      let recommendedCategoryId = currentCategoryId.value;
      try {
        const middleTime = Math.floor((startTime + endTime) / 2);
        const result = await recommendType({ date: selectedDate.value.format('YYYY-MM-DD'), time: middleTime });
        if (result) {
          recommendedCategoryId = result;
        }
      } catch (error) {
        console.error('获取推荐分类失败', error);
      }

      const newSlot: TimeSlot = {
        id: generateId(),
        startTime,
        endTime,
        categoryId: recommendedCategoryId,
        title: getCategoryName(recommendedCategoryId, config.value.categories),
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
        save(newSlot as any);
      } else {
        // todo
        timeSlots.value.push(newSlot);
        save(newSlot as any);
      }
    }
  } else if (dragOperation.value.type === 'move' || dragOperation.value.type === 'resize') {
    if (dragOperation.value.changed && dragOperation.value.slotId) {
      const slot = timeSlots.value.find(s => s.id === dragOperation.value?.slotId);
      if (slot) {
        update(slot as any);
      }
    }
  }

  dragOperation.value = null;
};

const handleTrackPointerLeave = () => {
  if (dragOperation.value?.type === 'create') {
    dragOperation.value = null;
  }
};

const handleSlotPointerDown = (event: MouseEvent | TouchEvent, slot: TimeSlot) => {
  event.stopPropagation();

  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const y = getClientY(event) - rect.top;

  dragOperation.value = {
    type: 'move',
    slotId: slot.id,
    startY: y,
    startTime: slot.startTime,
    currentTime: slot.startTime,
    originalStart: slot.startTime,
    originalEnd: slot.endTime,
    changed: false
  };
};

const handleResizeStartPointer = (event: MouseEvent | TouchEvent, slot: TimeSlot, direction: 'top' | 'bottom') => {
  event.stopPropagation();

  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const y = getClientY(event) - rect.top;

  dragOperation.value = {
    type: 'resize',
    slotId: slot.id,
    startY: y,
    startTime: direction === 'top' ? slot.startTime : slot.endTime,
    currentTime: direction === 'top' ? slot.startTime : slot.endTime,
    direction,
    originalStart: slot.startTime,
    originalEnd: slot.endTime,
    changed: false
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
  if (sameDaySlots[0]?.startTime && sameDaySlots[0].startTime >= 30) {
    return 0;
  }

  // 检查时间段之间的空隙
  for (let i = 0; i < sameDaySlots.length - 1; i++) {
    const currentSlot = sameDaySlots[i];
    const nextSlot = sameDaySlots[i + 1];

    // 计算当前时间段结束时间和下一个时间段开始时间之间的空隙大小
    const gapSize = nextSlot!.startTime - currentSlot!.endTime - 1;

    // 如果空隙足够容纳30分钟的时间段，或者空隙大于0（允许插入较短时间段）
    if (gapSize >= 30 || gapSize > 0) {
      return currentSlot!.endTime + 1;
    }
  }

  // 检查最后一个时间段之后是否有足够的空间
  const lastSlot = sameDaySlots[sameDaySlots.length - 1];
  if (lastSlot?.endTime && lastSlot.endTime + 30 <= 1439) {
    return lastSlot.endTime + 1;
  }

  // 如果没有足够的空间，返回当天最后一个时间段的结束时间 + 1分钟
  // 但确保不超过23:59
  return Math.min((lastSlot?.endTime || 0) + 1, 1439);
};

const handleAddSlot = async () => {
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
      endTime = Math.min(smartStartTime + availableTime, isToday ? currentTime.value : 1439);
    }
  }

  // 获取推荐分类
  let recommendedCategoryId = currentCategoryId.value;
  try {
    const middleTime = Math.floor((smartStartTime + endTime) / 2);
    const result = await recommendType({ date: currentDate, time: middleTime });
    if (result) {
      recommendedCategoryId = result;
    }
  } catch (error) {
    console.error('获取推荐分类失败', error);
  }

  // 创建新的时间段对象
  const newSlot: TimeSlot = {
    id: generateId(),
    startTime: smartStartTime,
    endTime: endTime,
    categoryId: recommendedCategoryId,
    title: getCategoryName(recommendedCategoryId, config.value.categories),
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
      save(newSlot as any);
      showEditModal.value = false;
    } else {
      message.error('时间段无效或重叠');
    }
  }
};

const handleDeleteSlot = async (slotId: string) => {
  try {
    loading.value = true;
    await deleteData({ id: slotId });
    timeSlots.value = timeSlots.value.filter(slot => slot.id !== slotId);
    showEditModal.value = false;
    message.success('删除成功');
  } catch (err) {
    console.error('删除失败:', err);
    message.error('删除失败');
  } finally {
    loading.value = false;
  }
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


</script>

<style scoped>
.time-tracker {
  padding: 20px;
  max-width: none;
  margin: 0;
}

.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 10px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 3px; /* 控制三个区域之间的间距 */
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.left-panel {
  flex: 3;
  min-width: 500px;
}

.right-panel {
  flex: 2;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.header h2 {
  margin: 0;
  color: #262626;
}

.date-picker-container {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid v-bind('token.colorBorder');
  border-radius: 8px;
  background-color: v-bind('token.colorBgContainer');
  transition: all 0.2s;
  overflow: hidden;
}

.date-nav-button.ant-btn {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  width: 32px !important;
  height: 30px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: v-bind('token.colorTextSecondary');
}

.date-nav-button.ant-btn:hover {
  color: v-bind('token.colorPrimary');
  background-color: v-bind('token.controlItemBgHover') !important;
}

.date-nav-button:first-child {
  border-right: 1px solid v-bind('token.colorSplit') !important;
}

.date-nav-button:last-child {
  border-left: 1px solid v-bind('token.colorSplit') !important;
}

.date-picker-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 4px;
  height: 30px;
}

.date-picker-wrapper:hover {
  background-color: v-bind('token.controlItemBgHover');
}

.date-text {
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  line-height: 1.5;
  color: v-bind('token.colorText');
}

.hidden-date-picker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  opacity: 0;
  padding: 0 !important;
  margin: 0 !important;
  z-index: 1;
  min-width: 0 !important;
  visibility: visible;
}

/* 覆盖之前的样式，避免冲突 */
.date-picker-container .ant-picker {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  width: auto !important;
}

.date-picker-container .ant-picker::before,
.date-picker-container .ant-picker::after {
  display: none;
}

/* 手机端样式 */
@media (max-width: 1024px) {
  .date-picker-container {
    border-radius: 5px;
  }

  .date-nav-button.ant-btn {
    height: 24px !important;
    width: 24px !important;
  }

  .date-picker-container .ant-picker {
    height: 24px !important;
  }

  .date-picker-wrapper {
    height: 24px;
  }
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

.category-popover {
  max-width: 280px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-button-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-indicator {
  width: 12px;
  height: 12px;
}

.timeline-container {
  position: relative;
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

.month-timeline-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 800px;
}

.month-header {
  display: grid;
  grid-template-columns: 60px repeat(var(--month-day-count, 30), 1fr);
  height: 45px;
  border-bottom: 1px solid #d9d9d9;
  background: #fafafa;
  overflow: hidden;
}

.month-day-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-right: 1px solid #d9d9d9;
  transition: background-color 0.2s;
  min-width: 80px;
}

.month-day-header:hover {
  background: #f0f0f0;
}

.month-day-header.active {
  background: #e6f7ff;
  font-weight: 500;
}

.month-timeline-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.month-days-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(var(--month-day-count, 30), minmax(80px, 1fr));
  overflow-x: auto;
}

.month-day-track {
  position: relative;
  background: #f8f9fa;
  border-right: 1px solid #d9d9d9;
  min-width: 80px;
}

.month-day-track .time-slot {
  left: 2px;
  width: calc(100% - 4px);
}

.month-day-track .slot-content {
  padding: 3px;
}

.month-day-track .slot-title {
  font-size: 11px;
  line-height: 1.2;
}

.week-header {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);
  height: 45px;
  border-bottom: 1px solid #d9d9d9;
  background: #fafafa;
}

.time-scale-header {
  width: 60px;
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
  font-size: 8px;
  color: #8c8c8c;
}

.week-timeline-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.week-days-container {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.week-day-track {
  position: relative;
  background: #f8f9fa;
  border-right: 1px solid #d9d9d9;
  min-width: 0;
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

.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stats-cards-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 110px; /* 固定宽度 */
  flex: none;
}

.stat-square-card {
  position: relative;
  aspect-ratio: 1; /* 正方形 */
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05); /* 更淡的边框 */
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s;
  cursor: default;
  overflow: hidden; /* 确保背景不溢出圆角 */
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.02); /* 内阴影增加质感 */
}

.stat-square-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); /* 更柔和的悬浮阴影 */
  border-color: transparent;
}

.stat-label-corner {
  position: absolute;
  top: 12px;
  left: 14px;
  font-size: 13px;
  font-weight: 500;
  color: #595959;
  line-height: 1;
  z-index: 2; /* 确保在背景之上 */
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8); /* 文字描边效果 */
}

.stat-value-center {
  font-size: 18px;
  font-weight: 700;
  color: #262626;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, monospace;
  z-index: 2; /* 确保在背景之上 */
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8); /* 文字描边效果 */
}

.pie-chart-card {
  min-width: 300px;
  flex: 2;
}

/* 浮动添加按钮样式 */
.floating-add-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 10;
}

.floating-add-button .add-button {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  background-color: rgba(24, 144, 255, 0.6) !important;
  border: none !important;
}

.floating-add-button .add-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.floating-add-button .add-button:active {
  transform: scale(0.95);
}

.floating-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  background-color: rgba(24, 144, 255, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 10000;
  user-select: none;
  backdrop-filter: blur(4px);
}

.floating-btn:hover {
  background-color: rgba(24, 144, 255, 0.8);
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.floating-btn::before,
.floating-btn::after {
  content: '';
  position: absolute;
  background-color: white;
}

.floating-btn::before {
  width: 24px;
  height: 2px;
}

.floating-btn::after {
  width: 2px;
  height: 24px;
}

@media (max-width: 1024px) {
  .time-tracker {
    padding: 10px;
  }
  .content-layout {
    flex-direction: column;
  }
  .left-panel, .right-panel {
    min-width: 0;
    width: 100%;
  }
  .header {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .header-right {
    flex-wrap: nowrap;
    flex-shrink: 0;
    gap: 8px;
  }
  .actions {
    display: flex;
    flex-wrap: nowrap;
    gap: 3px;
    flex-shrink: 0;
  }
  .header-right .ant-radio-group {
    display: inline-flex;
    flex-wrap: nowrap;
  }
  .header-right .ant-radio-group .ant-radio-button-wrapper {
    flex: 0 0 auto;
  }
  .category-selector {
    flex-direction: column;
    align-items: flex-start;
  }
  .timeline-container {
    height: calc(100vh - 320px);
  }
  .week-timeline-container {
    height: calc(100vh - 320px);
  }
  .month-timeline-container {
    height: calc(100vh - 320px);
  }
  .month-header {
    grid-template-columns: 35px repeat(var(--month-day-count, 30), minmax(45px, 1fr));
  }
  .week-header {
    grid-template-columns: 35px repeat(7, 1fr);
  }
  .month-day-header {
    min-width: 45px;
    padding: 2px;
  }
  .month-days-container {
    grid-template-columns: repeat(var(--month-day-count, 30), minmax(45px, 1fr));
  }
  .month-day-track {
    min-width: 45px;
    overflow: hidden;
  }
  .time-scale {
    width: 35px;
  }
  .hour-label {
    font-size: 9px;
    left: 2px;
  }
  .slot-title {
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slot-time {
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .week-day-track {
    min-width: 0;
  }
  /* 修复月视图时间槽溢出问题 */
  .month-day-track .time-slot {
    left: 1px;
    width: calc(100% - 2px);
    min-height: 20px;
  }
  .month-day-track .slot-content {
    padding: 2px 1px;
    overflow: hidden;
  }
  .month-day-track .slot-info {
    gap: 2px;
    flex-wrap: wrap;
  }
  .day-name {
    font-size: 12px;
  }
  .day-date {
    font-size: 7px;
  }

  /* 手机端浮动按钮样式 */
  .floating-add-button {
    bottom: 16px;
    right: 16px;
  }

  .floating-add-button .add-button {
    width: 43px;
    height: 43px;
    font-size: 18px;
  }

  .stats-cards-group {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .stat-square-card {
    flex: 1;
    min-width: 0;
  }
}

/* Custom padding overrides */
:deep(.bar-chart-card .ant-card-body),
:deep(.daily-bar-chart-card .ant-card-body),
:deep(.pie-chart-card .ant-card-body) {
  padding: 10px !important;
}

</style>
