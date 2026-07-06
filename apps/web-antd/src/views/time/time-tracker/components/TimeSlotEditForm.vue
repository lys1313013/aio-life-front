<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type {
  ExerciseDetail,
  MergedCategory,
  TimeSlot,
  TimeSlotCategory,
  TimeSlotFormData,
} from '../types';

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  DeleteOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Textarea,
  theme,
  TimePicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getRelateTypes } from '#/api/core/time-tracker';
import { getByDictType } from '#/api/core/userDictType';

import {
  getCategoryColor,
  getCategoryIconById,
  getCategoryName,
} from '../config';
import {
  getAboveSlotEndTime,
  getBelowSlotStartTime,
  minutesToTime,
  timeToMinutes,
} from '../utils';
import RelateRecordSelector from './RelateRecordSelector.vue';

interface Props {
  slot: TimeSlot;
  categories: (MergedCategory | TimeSlotCategory)[];
  existingSlots?: TimeSlot[];
}

interface Emits {
  (e: 'save', data: TimeSlotFormData): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { useToken } = theme;
const { token } = useToken();

// 分类计算属性
const visibleCategories = computed(() => {
  return props.categories.filter((c) => !('isHidden' in c && c.isHidden));
});

const selectedCategory = computed(() => {
  if (!formState.value.categoryId) return null;
  return (
    props.categories.find((c) => c.id === formState.value.categoryId) || null
  );
});

const categoryModalVisible = ref(false);
const isMobile = ref(window.innerWidth < 1024);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
};

// 获取显示颜色
const getDisplayColor = (category: MergedCategory | TimeSlotCategory) => {
  return getCategoryColor(category.id, props.categories);
};

// 获取显示名称
const getDisplayName = (category: MergedCategory | TimeSlotCategory) => {
  return getCategoryName(category.id, props.categories);
};

// 获取显示图标
const getDisplayIcon = (category: MergedCategory | TimeSlotCategory) => {
  const iconName = getCategoryIconById(category.id, props.categories);
  if (iconName) {
    try {
      return createIconifyIcon(iconName);
    } catch (error) {
      console.warn(`Failed to create icon: ${iconName}`, error);
      return null;
    }
  }
  return null;
};

// 本地表单状态接口，时间字段使用 Dayjs
interface LocalFormState {
  id?: string;
  startTime?: dayjs.Dayjs;
  endTime?: dayjs.Dayjs;
  categoryId: string;
  title?: string;
  description?: string;
  exercises: ExerciseDetail[];
  relateId?: string;
  relateType?: number;
}

const formRef = ref<FormInstance>();
const formState = ref<LocalFormState>({
  id: '',
  startTime: undefined,
  endTime: undefined,
  categoryId: '',
  title: '',
  description: '',
  exercises: [],
  relateId: undefined,
  relateType: undefined,
});

const exerciseTypeOptions = ref<Array<{ label: string; value: string }>>([]);
const relateTypeList = ref<Array<{ label: string; value: number }>>([]);

// 为阅读、观影标题自动添加《》
const wrapTitleWithBrackets = (title: string) => {
  if (!title) return title;
  const trimmed = title.trim();
  if (trimmed.startsWith('《') && trimmed.endsWith('》')) return trimmed;
  if (trimmed.startsWith('《')) return `${trimmed}》`;
  if (trimmed.endsWith('》')) return `《${trimmed}`;
  return `《${trimmed}》`;
};

// 加载关联类型枚举
const loadRelateTypes = async () => {
  try {
    const res = await getRelateTypes();
    if (res) {
      relateTypeList.value = res;
    }
  } catch (error) {
    console.error('加载关联类型失败:', error);
  }
};

// 判断是否为运动分类
const isExerciseCategory = computed(() => {
  const categoryId = formState.value.categoryId;
  if (!categoryId) return false;
  const category = props.categories.find((c) => c.id === categoryId);
  return category?.name === '运动' || categoryId === 'exercise';
});

// 判断是否为已有时间段
const isExistingSlot = computed(() => {
  if (!formState.value.id) return false;
  if (props.existingSlots) {
    return props.existingSlots.some((slot) => slot.id === formState.value.id);
  }
  return true; // 如果没有提供 existingSlots，默认如果 id 存在则认为是已有的
});

// 动态识别关联类型 (消除硬编码)
const currentRelateType = computed(() => {
  const categoryId = formState.value.categoryId;
  if (!categoryId || relateTypeList.value.length === 0) return undefined;
  const category = props.categories.find((c) => c.id === categoryId);
  if (!category) return undefined;
  const matchedEnum = relateTypeList.value.find((e) =>
    category.name.includes(e.label),
  );
  return matchedEnum ? Number(matchedEnum.value) : undefined;
});

// 加载运动类型
const loadExerciseTypes = async () => {
  try {
    const res = await getByDictType('exercise_type');
    if (res && res.dictDetailList) {
      exerciseTypeOptions.value = res.dictDetailList.map((item: any) => ({
        label: item.dictLabel || item.label,
        value: String(item.id),
      }));
    }
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

onMounted(() => {
  loadExerciseTypes();
  loadRelateTypes();
  window.addEventListener('resize', updateIsMobile);
});

// 长按连续调整
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const repeatTimer = ref<ReturnType<typeof setInterval> | null>(null);
const longPressDirection = ref(0);
const longPressType = ref<'start' | 'end'>('start');
const longPressTriggered = ref(false);
const LONG_PRESS_DELAY = 400;
const REPEAT_INTERVAL = 100;

const clearAllTimers = () => {
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  if (repeatTimer.value !== null) {
    clearInterval(repeatTimer.value);
    repeatTimer.value = null;
  }
};

const doAdjust = (direction: number, type: 'start' | 'end') => {
  if (type === 'start') {
    adjustStartTime(direction);
  } else {
    adjustEndTime(direction);
  }
};

// 计算时长
const duration = computed(() => {
  if (!formState.value.startTime || !formState.value.endTime) return 0;

  const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));

  return Math.max(0, endMinutes - startMinutes + 1);
});

// 更新时长逻辑
const updateDuration = (val: number) => {
  if (!formState.value.startTime) return;

  const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  const proposedEndMinutes = startMinutes + val;

  let maxMinutes = 1439;

  if (props.existingSlots) {
    const tempSlot = {
      ...props.slot,
      id: formState.value.id || 'temp-id',
      startTime: startMinutes,
      endTime: startMinutes, // 设置为开始时间，以便查找紧邻的下一个时间段
    };

    const belowStartTime = getBelowSlotStartTime(
      props.existingSlots,
      tempSlot,
      tempSlot.id,
    );
    if (belowStartTime !== null) {
      maxMinutes = belowStartTime - 1; // 结束时间不能超过下一个时间段的开始时间
    }
  }

  // 确保结束时间不小于开始时间+1分钟，且不超过最大限制
  const finalEndMinutes = Math.max(
    startMinutes + 1,
    Math.min(maxMinutes, proposedEndMinutes),
  );

  formState.value.endTime = minutesToTimePickerValue(finalEndMinutes);
};

// 计算小时（可编辑）
const editableHours = computed({
  get: () => Math.floor(duration.value / 60),
  set: (val: number) => {
    const currentMinutes = duration.value % 60;
    const totalMinutes = (val || 0) * 60 + currentMinutes;
    updateDuration(totalMinutes);
  },
});

// 计算分钟（可编辑）
const editableMinutes = computed({
  get: () => duration.value % 60,
  set: (val: number) => {
    const currentHours = Math.floor(duration.value / 60);
    const totalMinutes = currentHours * 60 + (val || 0);
    updateDuration(totalMinutes);
  },
});

// 表单验证规则
const rules: any = {
  title: [{ max: 50, message: '标题不能超过50个字符', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: () => {
        if (!formState.value.startTime || !formState.value.endTime) {
          return Promise.resolve();
        }

        const startMinutes = timeToMinutes(
          formState.value.startTime.format('HH:mm'),
        );
        const endMinutes = timeToMinutes(
          formState.value.endTime.format('HH:mm'),
        );

        if (endMinutes < startMinutes) {
          return Promise.reject(new Error('结束时间必须大于等于开始时间'));
        }

        if (endMinutes - startMinutes < 0) {
          return Promise.reject(new Error('时间段不能少于1分钟'));
        }

        return Promise.resolve();
      },
      trigger: 'change',
    },
  ],
  description: [
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' },
  ],
};

// 将分钟数转换为时间选择器值
const minutesToTimePickerValue = (minutes: number) => {
  const timeStr = minutesToTime(minutes);
  return dayjs(timeStr, 'HH:mm');
};

// 初始化表单
const initializeForm = (slot: TimeSlot) => {
  let exercises: ExerciseDetail[] = [];
  if (slot.exercises && slot.exercises.length > 0) {
    // Deep copy to avoid reference issues
    exercises = JSON.parse(JSON.stringify(slot.exercises));
  }

  // Ensure at least one empty row if category is exercise
  const isExercise =
    slot.categoryId === 'exercise' ||
    props.categories.find((c) => c.id === slot.categoryId)?.name === '运动';

  if (isExercise && exercises.length === 0) {
    exercises.push({ exerciseTypeId: '', exerciseCount: undefined });
  }

  formState.value = {
    id: slot.id,
    startTime: minutesToTimePickerValue(slot.startTime),
    endTime: minutesToTimePickerValue(slot.endTime),
    categoryId: slot.categoryId,
    title: slot.title,
    description: slot.description || '',
    exercises,
    relateId: slot.relateId || undefined,
    relateType: slot.relateType || undefined,
  };
};

// 监听props变化
watch(
  () => props.slot,
  (newSlot, oldSlot) => {
    if (newSlot) {
      // 如果是新打开的或者切换了时间段，完全重新初始化
      if (!oldSlot || newSlot.id !== oldSlot.id) {
        initializeForm(newSlot);
      } else {
        // 如果是同一个时间段的更新（如异步获取推荐分类），只更新变化的字段
        if (newSlot.categoryId !== oldSlot.categoryId) {
          formState.value.categoryId = newSlot.categoryId;
        }
        if (newSlot.title !== oldSlot.title) {
          formState.value.title = newSlot.title;
        }
        // 同步更新时间字段
        if (newSlot.startTime !== oldSlot.startTime) {
          formState.value.startTime = minutesToTimePickerValue(
            newSlot.startTime,
          );
        }
        if (newSlot.endTime !== oldSlot.endTime) {
          formState.value.endTime = minutesToTimePickerValue(newSlot.endTime);
        }
        // 同步更新关联记录
        if (newSlot.relateId !== oldSlot.relateId) {
          formState.value.relateId = newSlot.relateId || undefined;
        }
        if (newSlot.relateType !== oldSlot.relateType) {
          formState.value.relateType = newSlot.relateType || undefined;
        }
        // 同步更新运动明细
        if (
          JSON.stringify(newSlot.exercises) !==
          JSON.stringify(oldSlot.exercises)
        ) {
          if (newSlot.exercises && newSlot.exercises.length > 0) {
            formState.value.exercises = JSON.parse(
              JSON.stringify(newSlot.exercises),
            );
          } else if (
            isExerciseCategory.value &&
            formState.value.exercises.length === 0
          ) {
            // 如果是运动分类且没有明细，添加一行空明细
            formState.value.exercises = [
              { exerciseTypeId: '', exerciseCount: undefined },
            ];
          }
        }
      }
    }
  },
  { immediate: true },
);

// 处理分类变化
// 标题失焦时，若为阅读/观影分类，自动添加《》
const handleTitleBlur = () => {
  if (currentRelateType.value && formState.value.title) {
    formState.value.title = wrapTitleWithBrackets(formState.value.title);
  }
};

const handleCategoryChange = () => {
  // 不再自动填充标题，展示逻辑会处理 fallback
  if (isExerciseCategory.value && formState.value.exercises.length === 0) {
    formState.value.exercises = [
      { exerciseTypeId: '', exerciseCount: undefined },
    ];
  }

  // 切换分类时如果不需要关联了，清除掉
  if (currentRelateType.value) {
    formState.value.relateType = currentRelateType.value;
  } else {
    formState.value.relateId = undefined;
    formState.value.relateType = undefined;
  }

  formRef.value?.validateFields(['categoryId']).catch(() => {});
};

const handleCategorySelect = (category: MergedCategory | TimeSlotCategory) => {
  formState.value.categoryId = category.id;
  handleCategoryChange();
  categoryModalVisible.value = false;
};

// 处理保存
const handleSave = async () => {
  try {
    await formRef.value?.validate();

    if (!formState.value.startTime || !formState.value.endTime) {
      message.error('请选择开始和结束时间');
      return;
    }

    const saveData: TimeSlotFormData = {
      id: formState.value.id,
      startTime: timeToMinutes(formState.value.startTime.format('HH:mm')),
      endTime: timeToMinutes(formState.value.endTime.format('HH:mm')),
      categoryId: formState.value.categoryId,
      title: formState.value.title,
      description: formState.value.description,
      exercises: isExerciseCategory.value
        ? formState.value.exercises.filter((e) => e.exerciseTypeId)
        : [],
      relateId: formState.value.relateId,
      relateType: formState.value.relateType,
    };

    emit('save', saveData);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 调整开始时间
const adjustStartTime = (minutes: number) => {
  if (!formState.value.startTime) return;

  const currentMinutes = timeToMinutes(
    formState.value.startTime.format('HH:mm'),
  );
  const proposedMinutes = currentMinutes + minutes;

  // 获取上下界限
  let minMinutes = 0;
  let maxMinutes = 1439;

  if (props.existingSlots && props.slot) {
    // 构造当前临时slot用于查询
    const tempSlot = {
      ...props.slot,
      id: formState.value.id || 'temp-id',
      startTime: currentMinutes,
      endTime: formState.value.endTime
        ? timeToMinutes(formState.value.endTime.format('HH:mm'))
        : currentMinutes + 30,
    };

    // 获取上方最近的时间段结束时间
    // 注意：这里我们要找的是在这个slot开始时间之前最近的一个结束时间
    const aboveEndTime = getAboveSlotEndTime(
      props.existingSlots,
      tempSlot,
      tempSlot.id,
    );
    if (aboveEndTime !== null) {
      // 限制：必须 > 上一个的结束时间。如果上一个结束是10:30，这里只能是10:31
      minMinutes = aboveEndTime + 1;
    }
  }

  // 如果有结束时间，开始时间必须小于结束时间
  if (formState.value.endTime) {
    const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));
    // 限制最大值为结束时间 - 1
    maxMinutes = Math.min(maxMinutes, endMinutes - 1);
  }

  // 如果范围无效（min > max），则不调整
  if (minMinutes > maxMinutes) return;

  // 限制范围
  const newMinutes = Math.max(
    minMinutes,
    Math.min(maxMinutes, proposedMinutes),
  );

  formState.value.startTime = minutesToTimePickerValue(newMinutes);
};

// 调整结束时间
const adjustEndTime = (minutes: number) => {
  if (!formState.value.endTime) return;

  const currentMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));
  const proposedMinutes = currentMinutes + minutes;

  let maxMinutes = 1439;
  let minMinutes = 0; // 受限于开始时间

  if (formState.value.startTime) {
    minMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  }

  if (props.existingSlots && props.slot) {
    const tempSlot = {
      ...props.slot,
      id: formState.value.id || 'temp-id',
      startTime: formState.value.startTime
        ? timeToMinutes(formState.value.startTime.format('HH:mm'))
        : 0,
      endTime: currentMinutes,
    };

    const belowStartTime = getBelowSlotStartTime(
      props.existingSlots,
      tempSlot,
      tempSlot.id,
    );
    if (belowStartTime !== null) {
      // 限制：必须 < 下一个的开始时间。如果下一个开始是11:00，这里只能是10:59
      maxMinutes = belowStartTime - 1;
    }
  }

  const newMinutes = Math.max(
    minMinutes,
    Math.min(maxMinutes, proposedMinutes),
  );

  formState.value.endTime = minutesToTimePickerValue(newMinutes);
};

const addExercise = () => {
  let lastExerciseTypeId: string = '';
  if (formState.value.exercises.length > 0) {
    const lastExercise =
      formState.value.exercises[formState.value.exercises.length - 1];
    if (lastExercise) {
      lastExerciseTypeId = lastExercise.exerciseTypeId || '';
    }
  }
  formState.value.exercises.push({
    exerciseTypeId: lastExerciseTypeId,
    exerciseCount: undefined,
  });
};

const handleExerciseTypeChange = (value: any, index: number) => {
  if (index === 0 && value && typeof value === 'string') {
    const option = exerciseTypeOptions.value.find((opt) => opt.value === value);
    if (option && option.label) {
      const currentTitle = formState.value.title;
      const isDefaultTitle =
        !currentTitle ||
        exerciseTypeOptions.value.some(
          (opt) => !!opt.label && opt.label === currentTitle,
        );
      if (isDefaultTitle) {
        formState.value.title = option.label;
      }
    }
  }
};

const removeExercise = (index: number) => {
  formState.value.exercises.splice(index, 1);
};

// 处理删除
const handleDelete = () => {
  if (formState.value.id) {
    emit('delete', formState.value.id);
  }
};

// mousedown / touchstart：启动长按检测
const startLongPress = (direction: number, type: 'start' | 'end') => {
  clearAllTimers();
  longPressDirection.value = direction;
  longPressType.value = type;
  longPressTriggered.value = false;
  longPressTimer.value = setTimeout(() => {
    longPressTriggered.value = true;
    doAdjust(direction, type);
    repeatTimer.value = setInterval(() => {
      doAdjust(longPressDirection.value, longPressType.value);
    }, REPEAT_INTERVAL);
  }, LONG_PRESS_DELAY);
};

// mouseup / mouseleave / touchend / touchcancel：停止
// 若定时器未触发（短按），执行一次调整并阻止后续 click
const stopLongPress = () => {
  if (!longPressTriggered.value && longPressTimer.value !== null) {
    longPressTriggered.value = true;
    doAdjust(longPressDirection.value, longPressType.value);
  }
  clearAllTimers();
};

// @click：键盘 / 无障碍后备（mousedown 已处理的会被 longPressTriggered 屏蔽）
const handleClick = (direction: number, type: 'start' | 'end') => {
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }
  doAdjust(direction, type);
};

// TimePicker 展开时将选中项滚动到列中央
// Ant Design 内部也会在 popup 渲染后执行 scrollIntoView，因此延迟后再覆盖一次
const scrollTimePanelToCenter = () => {
  document
    .querySelectorAll('.ant-picker-time-panel-cell-selected')
    .forEach((cell) => {
      const column = cell.closest<HTMLElement>('.ant-picker-time-panel-column');
      if (!column) return;
      const cellTop =
        cell.getBoundingClientRect().top -
        column.getBoundingClientRect().top +
        column.scrollTop;
      column.scrollTop = cellTop - column.clientHeight / 2;
    });
};

const handleTimePickerOpenChange = (open: boolean) => {
  if (!open) return;
  // 覆盖 Ant Design 内部的 scrollIntoView，确保选中项居中
  setTimeout(() => requestAnimationFrame(scrollTimePanelToCenter), 30);
  setTimeout(() => requestAnimationFrame(scrollTimePanelToCenter), 180);
};

// 组件卸载时清理定时器
onUnmounted(() => {
  clearAllTimers();
  window.removeEventListener('resize', updateIsMobile);
});
</script>

<template>
  <div class="time-slot-edit-form">
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      @finish="handleSave"
    >
      <Form.Item label="标题" name="title">
        <Input
          v-model:value="formState.title"
          placeholder="标题"
          @blur="handleTitleBlur"
        />
      </Form.Item>

      <Form.Item name="categoryId">
        <div
          class="category-inline-trigger"
          @click="categoryModalVisible = true"
        >
          <span class="category-label-text">
            <span
              :style="{
                color: token.colorError,
                marginRight: '4px',
                fontFamily: 'SimSun, sans-serif',
              }"
              >*</span
            >分类
          </span>
          <div class="category-value-wrapper">
            <template v-if="selectedCategory">
              <div class="category-icon-wrapper-small">
                <component
                  v-if="getDisplayIcon(selectedCategory)"
                  :is="getDisplayIcon(selectedCategory)"
                  class="category-icon-small"
                  :style="{ color: getDisplayColor(selectedCategory) }"
                />
                <div
                  v-else
                  class="category-color-dot-small"
                  :style="{
                    backgroundColor: getDisplayColor(selectedCategory),
                  }"
                ></div>
              </div>
              <span class="category-name-small">{{
                getDisplayName(selectedCategory)
              }}</span>
            </template>
            <template v-else>
              <span class="placeholder-text">请选择分类</span>
            </template>
            <RightOutlined class="trigger-arrow" />
          </div>
        </div>
      </Form.Item>

      <Row :gutter="16">
        <Col :span="12">
          <Form.Item label="开始时间" name="startTime">
            <div class="time-control-group">
              <TimePicker
                v-model:value="formState.startTime"
                format="HH:mm"
                style="width: 100%"
                placeholder="选择开始时间"
                :input-read-only="isMobile"
                @openChange="handleTimePickerOpenChange"
              />
              <div class="time-adjust-buttons">
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(-1, 'start')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(-1, 'start')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.startTime"
                    @click="handleClick(-1, 'start')"
                  >-1</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(1, 'start')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(1, 'start')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.startTime"
                    @click="handleClick(1, 'start')"
                  >+1</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(-30, 'start')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(-30, 'start')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.startTime"
                    @click="handleClick(-30, 'start')"
                  >-30</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(30, 'start')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(30, 'start')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.startTime"
                    @click="handleClick(30, 'start')"
                  >+30</Button>
                </span>
              </div>
            </div>
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="结束时间" name="endTime">
            <div class="time-control-group">
              <TimePicker
                v-model:value="formState.endTime"
                format="HH:mm"
                style="width: 100%"
                placeholder="选择结束时间"
                :input-read-only="isMobile"
                @openChange="handleTimePickerOpenChange"
              />
              <div class="time-adjust-buttons">
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(-1, 'end')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(-1, 'end')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.endTime"
                    @click="handleClick(-1, 'end')"
                  >-1</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(1, 'end')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(1, 'end')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.endTime"
                    @click="handleClick(1, 'end')"
                  >+1</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(-30, 'end')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(-30, 'end')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.endTime"
                    @click="handleClick(-30, 'end')"
                  >-30</Button>
                </span>
                <span
                  class="adjust-btn-wrap"
                  @mousedown="startLongPress(30, 'end')"
                  @mouseup="stopLongPress"
                  @mouseleave="stopLongPress"
                  @touchstart.prevent="startLongPress(30, 'end')"
                  @touchend="stopLongPress"
                  @touchcancel="stopLongPress"
                >
                  <Button
                    size="small"
                    :disabled="!formState.endTime"
                    @click="handleClick(30, 'end')"
                  >+30</Button>
                </span>
              </div>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <div style="display: flex; gap: 8px; align-items: center">
          <span style="flex-shrink: 0; color: v-bind('token.colorText')">时长</span>
          <div style="display: flex; flex: 1; gap: 8px">
            <div style="display: flex; flex: 1; gap: 4px; align-items: center">
              <InputNumber
                v-model:value="editableHours"
                :min="0"
                :precision="0"
                class="input-align-right"
                style="flex: 1"
                placeholder="时"
                inputmode="numeric"
                pattern="[0-9]*"
              />
              <span>时</span>
            </div>
            <div style="display: flex; flex: 1; gap: 4px; align-items: center">
              <InputNumber
                v-model:value="editableMinutes"
                :min="0"
                :max="59"
                :precision="0"
                class="input-align-right"
                inputmode="numeric"
                pattern="[0-9]*"
                style="flex: 1"
                placeholder="分"
              />
              <span>分</span>
            </div>
          </div>
        </div>
      </Form.Item>

      <Form.Item
        v-if="currentRelateType"
        name="relateId"
        :style="{ marginBottom: '16px' }"
      >
        <RelateRecordSelector
          v-model:relate-id="formState.relateId"
          :relate-type="currentRelateType"
          @change="
            (item) => {
              formState.relateType = currentRelateType;
              if (item) {
                formState.title = wrapTitleWithBrackets(item.title);
              }
            }
          "
        />
      </Form.Item>

      <!-- 运动相关字段 -->
      <template v-if="isExerciseCategory">
        <div style="margin-bottom: 16px">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 8px;
            "
          >
            <span>运动明细</span>
            <Button type="link" size="small" @click="addExercise">
              <template #icon><PlusOutlined /></template>
              添加
            </Button>
          </div>

          <div
            v-for="(exercise, index) in formState.exercises"
            :key="index"
            style="
              display: flex;
              gap: 8px;
              align-items: center;
              margin-bottom: 8px;
            "
          >
            <div style="flex: 2">
              <Select
                v-model:value="exercise.exerciseTypeId"
                placeholder="运动类型"
                :options="exerciseTypeOptions"
                allow-clear
                style="width: 100%"
                @change="handleExerciseTypeChange($event, index)"
              />
            </div>
            <div style="flex: 1">
              <InputNumber
                v-model:value="exercise.exerciseCount"
                placeholder="数量"
                style="width: 100%"
                :min="0"
                :precision="0"
              />
            </div>
            <Button
              type="text"
              danger
              size="small"
              @click="removeExercise(index)"
            >
              <template #icon><DeleteOutlined /></template>
            </Button>
          </div>

          <div
            v-if="formState.exercises.length === 0"
            :style="{
              padding: '8px',
              color: token.colorTextQuaternary,
              textAlign: 'center',
              cursor: 'pointer',
              border: `1px dashed ${token.colorBorderSecondary}`,
              borderRadius: '4px',
            }"
            @click="addExercise"
          >
            点击添加运动明细
          </div>
        </div>
      </template>

      <Form.Item label="描述" name="description">
        <Textarea
          v-model:value="formState.description"
          placeholder="描述信息"
          :rows="3"
        />
      </Form.Item>

      <Form.Item style="margin-bottom: 0">
        <div class="form-actions">
          <Popconfirm
            v-if="isExistingSlot"
            title="确定要删除此时间段吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete"
          >
            <Button danger>删除</Button>
          </Popconfirm>
          <div style="margin-left: auto">
            <Button @click="$emit('cancel')">取消</Button>
            <Button type="primary" html-type="submit">保存</Button>
          </div>
        </div>
      </Form.Item>
    </Form>

    <Modal
      v-model:open="categoryModalVisible"
      :closable="false"
      :centered="true"
      :footer="null"
      :width="isMobile ? '95vw' : 500"
      :destroy-on-close="true"
    >
      <div class="category-grid">
        <div
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-grid-item"
          :class="{ active: formState.categoryId === category.id }"
          @click="handleCategorySelect(category)"
        >
          <div class="category-icon-wrapper">
            <component
              v-if="getDisplayIcon(category)"
              :is="getDisplayIcon(category)"
              class="category-icon-large"
              :style="{ color: getDisplayColor(category) }"
            />
            <div
              v-else
              class="category-color-dot-large"
              :style="{ backgroundColor: getDisplayColor(category) }"
            ></div>
          </div>
          <span class="category-name-large">{{
            getDisplayName(category)
          }}</span>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.time-slot-edit-form {
  padding: 0;
  margin-bottom: -16px;
  user-select: none;
}

.category-inline-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  cursor: pointer;
}

.category-label-text {
  font-size: 14px;
  color: v-bind('token.colorText');
}

.category-value-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
}

.category-icon-wrapper-small {
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-icon-small {
  font-size: 16px;
}

.category-color-dot-small {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.category-name-small {
  font-size: 14px;
  color: v-bind('token.colorText');
}

.placeholder-text {
  color: v-bind('token.colorTextPlaceholder');
  font-size: 14px;
}

.trigger-arrow {
  margin-left: 2px;
  font-size: 12px;
  color: v-bind('token.colorTextPlaceholder');
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 6px;
  max-height: 60vh;
  padding: 4px;
  overflow-y: auto;
}

.category-grid::-webkit-scrollbar {
  width: 4px;
}

.category-grid::-webkit-scrollbar-thumb {
  background-color: v-bind('token.colorTextQuaternary');
  border-radius: 2px;
}

.category-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.2s;
}

.category-grid-item:hover {
  background-color: v-bind('token.colorFillQuaternary');
}

.category-grid-item.active {
  background-color: v-bind('token.colorFillTertiary');
  border-color: v-bind('token.colorBorderSecondary');
}

.category-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin-bottom: 4px;
}

.category-icon-large {
  font-size: 20px;
  color: v-bind('token.colorTextSecondary');
  transition: color 0.2s;
}

.category-color-dot-large {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.category-name-large {
  font-size: 11px;
  line-height: 1.1;
  color: v-bind('token.colorText');
  text-align: center;
  transition: font-weight 0.2s;
}

.category-grid-item.active .category-name-large {
  font-weight: 600;
}

.duration-display {
  padding: 8px 12px;
  font-weight: 500;
  color: v-bind('token.colorText');
  background: v-bind('token.colorFillQuaternary');
  border-radius: 4px;
}

.time-control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-adjust-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.adjust-btn-wrap {
  display: flex;
  flex: 1;
  min-width: 0;
  touch-action: manipulation;
}

.time-adjust-buttons .ant-btn {
  flex: 1;
  min-width: 0;
  height: auto;
  padding: 2px 4px;
  font-size: 12px;
  line-height: 1.2;
}

.form-actions {
  display: flex;
  align-items: center;
}

.form-actions .ant-btn {
  margin-right: 8px;
}

.form-actions .ant-btn:last-child {
  margin-right: 0;
}

:deep(.input-align-right input) {
  text-align: right;
}

</style>
