<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';

import type {
  ExerciseDetail,
  MergedCategory,
  TimeSlot,
  TimeSlotCategory,
  TimeSlotFormData,
} from '../types';

import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import {
  AppstoreOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Spin,
  Textarea,
  theme,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getRelateTypes } from '#/api/core/time-tracker';
import { getByDictType } from '#/api/core/userDictType';
import {
  AppModalDelete,
  AppModalFooter,
  AppModal as Modal,
} from '#/components/app-modal';

import { categoryPath, orderCategoryTree } from '../category-tree';
import { getCategoryColor, getCategoryIconById } from '../config';
import { timeSelectionBounds } from '../time-selection';
import {
  getSlotDuration,
  isValidSlot,
  minutesToTime,
  timeToMinutes,
} from '../utils';
import RelateRecordSelector from './RelateRecordSelector.vue';
import TimeWheelPicker from './TimeWheelPicker.vue';

interface Props {
  slot: TimeSlot;
  categories: (MergedCategory | TimeSlotCategory)[];
  existingSlots?: TimeSlot[];
  busy?: boolean;
}

interface Emits {
  (e: 'save', data: TimeSlotFormData): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const startInputId = useId();
const endInputId = useId();

const { useToken } = theme;
const { token } = useToken();

// 分类计算属性
const visibleCategories = computed(() =>
  orderCategoryTree(props.categories.filter((c) => !c.isHidden)),
);

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
  return categoryPath(category.id, props.categories);
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
  startMinute?: dayjs.Dayjs;
  endMinute?: dayjs.Dayjs;
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
  startMinute: undefined,
  endMinute: undefined,
  categoryId: '',
  title: '',
  description: '',
  exercises: [],
  relateId: undefined,
  relateType: undefined,
});

interface ExerciseTypeOption {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

const exerciseTypeOptions = ref<ExerciseTypeOption[]>([]);
const exerciseTypesLoading = ref(false);
const exerciseTypeModalVisible = ref(false);
const currentEditingExerciseIndex = ref(-1);
const exerciseEditorVisible = ref(false);
const addingExerciseType = ref(false);
const selectedExerciseTypeId = ref('');
const exerciseTypeDraft = ref('');
const exerciseCountDraft = ref<number>();
const exerciseEditError = ref('');
const exerciseGroups = computed(() => {
  const groups: { indices: number[]; total: number; typeId: string }[] = [];
  formState.value.exercises.forEach((exercise, index) => {
    let group = groups.find((item) => item.typeId === exercise.exerciseTypeId);
    if (!group) {
      group = { typeId: exercise.exerciseTypeId, indices: [], total: 0 };
      groups.push(group);
    }
    group.indices.push(index);
    group.total += exercise.exerciseCount ?? 0;
  });
  return groups;
});
const activeExerciseGroup = computed(
  () =>
    exerciseGroups.value.find(
      (group) => group.typeId === selectedExerciseTypeId.value,
    ) || exerciseGroups.value[0],
);
const editingExerciseNumber = computed(
  () =>
    formState.value.exercises.filter(
      (exercise, index) =>
        exercise.exerciseTypeId === exerciseTypeDraft.value &&
        (currentEditingExerciseIndex.value < 0 ||
          index < currentEditingExerciseIndex.value),
    ).length + 1,
);
watch([exerciseTypeDraft, exerciseCountDraft], () => {
  exerciseEditError.value = '';
});
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
  const parent = props.categories.find((c) => c.id === category?.parentId);
  return (
    category?.name === '运动' ||
    parent?.name === '运动' ||
    categoryId === 'exercise'
  );
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
    categoryPath(category.id, props.categories).includes(e.label),
  );
  return matchedEnum ? Number(matchedEnum.value) : undefined;
});

// 加载运动类型
const loadExerciseTypes = async () => {
  exerciseTypesLoading.value = true;
  try {
    const res = await getByDictType('exercise_type');
    if (res && res.dictDetailList) {
      exerciseTypeOptions.value = res.dictDetailList.map((item: any) => ({
        label: item.dictLabel || item.label,
        value: String(item.id),
        icon: item.icon || 'lucide:dumbbell',
        color: item.color || '#1890ff',
      }));
    }
  } catch (error) {
    console.error('加载运动类型失败:', error);
  } finally {
    exerciseTypesLoading.value = false;
  }
};

onMounted(() => {
  loadExerciseTypes();
  loadRelateTypes();
  window.addEventListener('resize', updateIsMobile);
});

// 计算时长
const duration = computed(() => {
  const { startMinute, endMinute } = formState.value;
  if (!startMinute || !endMinute) return 0;

  const startMinutes = timeToMinutes(startMinute.format('HH:mm'));
  const endMinutes = timeToMinutes(endMinute.format('HH:mm'));

  return Math.max(
    0,
    getSlotDuration({ startMinute: startMinutes, endMinute: endMinutes }),
  );
});

const displayDuration = computed(() => {
  const hours = Math.floor(duration.value / 60);
  const minutes = duration.value % 60;
  return `${hours ? `${hours}小时` : ''}${minutes || !hours ? `${minutes}分` : ''}`;
});

// 表单验证规则
const rules: any = {
  title: [{ max: 50, message: '标题不能超过50个字符', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  startMinute: [
    { required: true, message: '请选择开始时间', trigger: 'change' },
  ],
  endMinute: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: () => {
        if (!formState.value.startMinute || !formState.value.endMinute) {
          return Promise.resolve();
        }

        const startMinutes = timeToMinutes(
          formState.value.startMinute.format('HH:mm'),
        );
        const endMinutes = timeToMinutes(
          formState.value.endMinute.format('HH:mm'),
        );

        if (
          !isValidSlot({ startMinute: startMinutes, endMinute: endMinutes })
        ) {
          return Promise.reject(new Error('结束时间必须大于等于开始时间'));
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

  selectedExerciseTypeId.value = '';
  exerciseEditorVisible.value = false;
  exerciseTypeModalVisible.value = false;
  formState.value = {
    id: slot.id,
    startMinute: minutesToTimePickerValue(slot.startMinute),
    endMinute: minutesToTimePickerValue(slot.endMinute),
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
        if (
          newSlot.date !== oldSlot.date ||
          newSlot.startMinute !== oldSlot.startMinute
        ) {
          formState.value.startMinute = minutesToTimePickerValue(
            newSlot.startMinute,
          );
        }
        if (
          newSlot.date !== oldSlot.date ||
          newSlot.endMinute !== oldSlot.endMinute
        ) {
          formState.value.endMinute = minutesToTimePickerValue(
            newSlot.endMinute,
          );
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
          formState.value.exercises = (newSlot.exercises || []).map(
            (exercise) => ({ ...exercise }),
          );
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
  if (props.busy) return;
  try {
    await formRef.value?.validate();

    if (!formState.value.startMinute || !formState.value.endMinute) {
      message.error('请选择开始和结束时间');
      return;
    }

    const saveData: TimeSlotFormData = {
      id: formState.value.id,
      startMinute: timeToMinutes(formState.value.startMinute.format('HH:mm')),
      endMinute: timeToMinutes(formState.value.endMinute.format('HH:mm')),
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

const addExercise = () => {
  if (props.busy) return;
  addingExerciseType.value = true;
  exerciseTypeModalVisible.value = true;
};

const openExerciseEditor = (index: number, typeId = '') => {
  if (props.busy) return;
  const exercise = index >= 0 ? formState.value.exercises[index] : undefined;
  let previous: ExerciseDetail | undefined;
  for (const item of formState.value.exercises) {
    if (item.exerciseTypeId === typeId) previous = item;
  }
  currentEditingExerciseIndex.value = index;
  exerciseTypeDraft.value = exercise?.exerciseTypeId || typeId;
  exerciseCountDraft.value = exercise?.exerciseCount ?? previous?.exerciseCount;
  exerciseEditError.value = '';
  exerciseEditorVisible.value = true;
};

const openExerciseTypeModal = () => {
  if (props.busy) return;
  addingExerciseType.value = false;
  exerciseTypeModalVisible.value = true;
};

const handleExerciseTypeSelect = (option: ExerciseTypeOption) => {
  if (props.busy) return;
  exerciseTypeModalVisible.value = false;
  if (addingExerciseType.value) {
    openExerciseEditor(-1, option.value);
  } else {
    exerciseTypeDraft.value = option.value;
  }
};

const saveExerciseSet = () => {
  if (props.busy) return;
  const count = exerciseCountDraft.value;
  if (
    !exerciseTypeDraft.value ||
    count == null ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    exerciseEditError.value = '请选择运动类型并填写有效次数';
    return;
  }
  const index = currentEditingExerciseIndex.value;
  const item = {
    exerciseTypeId: exerciseTypeDraft.value,
    exerciseCount: count,
  };
  if (index >= 0) {
    formState.value.exercises[index] = {
      ...formState.value.exercises[index],
      ...item,
    };
  } else {
    formState.value.exercises.push(item);
  }
  handleExerciseTypeChange(
    item.exerciseTypeId,
    index < 0 ? formState.value.exercises.length - 1 : index,
  );
  selectedExerciseTypeId.value = item.exerciseTypeId;
  exerciseEditorVisible.value = false;
};

// 根据 exerciseTypeId 获取运动类型选项
const getExerciseTypeOption = (
  typeId: string,
): ExerciseTypeOption | undefined => {
  return exerciseTypeOptions.value.find((opt) => opt.value === typeId);
};

const exerciseName = (typeId: string) =>
  getExerciseTypeOption(typeId)?.label || '已选运动';

// 渲染运动类型图标
const renderExerciseTypeIcon = (option: ExerciseTypeOption | undefined) => {
  if (!option?.icon) return null;
  try {
    return createIconifyIcon(option.icon);
  } catch (error) {
    console.warn(`Failed to create icon: ${option.icon}`, error);
    return null;
  }
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
  if (props.busy) return;
  formState.value.exercises.splice(index, 1);
};

const removeEditingExercise = () => {
  if (props.busy) return;
  removeExercise(currentEditingExerciseIndex.value);
  exerciseEditorVisible.value = false;
};

// 处理删除
const handleDelete = () => {
  if (formState.value.id) {
    emit('delete', formState.value.id);
  }
};

const selectionBounds = computed(() => {
  const record = {
    id: formState.value.id,
    date: props.slot.date,
    startMinute: formState.value.startMinute
      ? timeToMinutes(formState.value.startMinute.format('HH:mm'))
      : 0,
    endMinute: formState.value.endMinute
      ? timeToMinutes(formState.value.endMinute.format('HH:mm'))
      : 1439,
  };
  return {
    startMinute: timeSelectionBounds(
      record,
      props.existingSlots || [],
      'startMinute',
    ),
    endMinute: timeSelectionBounds(
      record,
      props.existingSlots || [],
      'endMinute',
    ),
  };
});

// 组件卸载时清理监听
onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
});
</script>

<template>
  <div class="time-slot-edit-form">
    <Form
      ref="formRef"
      :model="formState"
      :rules="rules"
      :disabled="busy"
      layout="vertical"
      @finish="handleSave"
    >
      <Form.Item name="categoryId">
        <button
          type="button"
          class="category-inline-trigger"
          aria-label="选择分类"
          :disabled="busy"
          @click="categoryModalVisible = true"
        >
          <component
            v-if="selectedCategory && getDisplayIcon(selectedCategory)"
            :is="getDisplayIcon(selectedCategory)"
            class="category-icon-small"
            :style="{ color: getDisplayColor(selectedCategory) }"
          />
          <span
            v-else-if="selectedCategory"
            class="category-color-dot-small"
            :style="{ backgroundColor: getDisplayColor(selectedCategory) }"
          ></span>
          <AppstoreOutlined v-else class="category-icon-small" />
          <span class="category-name-small">{{
            selectedCategory ? getDisplayName(selectedCategory) : '选择分类'
          }}</span>
          <RightOutlined class="trigger-arrow" />
        </button>
      </Form.Item>

      <div class="compact-time-range">
        <Form.Item name="startMinute" class="compact-time-field">
          <label :for="startInputId" class="compact-time-label">开始</label>
          <TimeWheelPicker
            :id="startInputId"
            v-model:value="formState.startMinute"
            label="开始时间"
            class="time-value-picker"
            :min="selectionBounds.startMinute.min"
            :max="selectionBounds.startMinute.max"
            :show-now="false"
            :input-read-only="isMobile"
            :disabled="busy"
          />
        </Form.Item>
        <div class="compact-time-summary">
          <span class="compact-duration" aria-label="记录时长">{{
            displayDuration
          }}</span>
          <span class="compact-time-arrow" aria-hidden="true"></span>
        </div>
        <Form.Item name="endMinute" class="compact-time-field">
          <label :for="endInputId" class="compact-time-label">结束</label>
          <TimeWheelPicker
            :id="endInputId"
            v-model:value="formState.endMinute"
            label="结束时间"
            class="time-value-picker"
            :min="selectionBounds.endMinute.min"
            :max="selectionBounds.endMinute.max"
            :show-now="true"
            :input-read-only="isMobile"
            :disabled="busy"
          />
        </Form.Item>
      </div>

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

      <section
        v-if="isExerciseCategory"
        class="exercise-section"
        aria-label="运动明细"
      >
        <div class="exercise-heading">
          <span>运动明细</span>
          <Button
            type="text"
            class="exercise-action"
            aria-label="添加运动"
            :disabled="busy"
            @click="addExercise"
          >
            <template #icon><PlusOutlined /></template>
          </Button>
        </div>
        <div
          v-if="exerciseGroups.length > 0"
          class="exercise-tabs"
          role="group"
          aria-label="运动分组"
        >
          <button
            v-for="group in exerciseGroups"
            :key="group.typeId"
            type="button"
            class="exercise-tab"
            :class="{ active: activeExerciseGroup?.typeId === group.typeId }"
            :aria-label="`${exerciseName(group.typeId)}，${group.indices.length}组，共${group.total}次`"
            :aria-pressed="activeExerciseGroup?.typeId === group.typeId"
            :disabled="busy"
            @click="selectedExerciseTypeId = group.typeId"
          >
            <span class="exercise-tab-heading">
              <component
                v-if="
                  renderExerciseTypeIcon(getExerciseTypeOption(group.typeId))
                "
                :is="
                  renderExerciseTypeIcon(getExerciseTypeOption(group.typeId))!
                "
                class="exercise-type-icon"
                :style="{ color: getExerciseTypeOption(group.typeId)?.color }"
              />
              <span class="exercise-tab-name">{{
                exerciseName(group.typeId)
              }}</span>
            </span>
            <span class="exercise-tab-summary"
              >{{ group.indices.length }}组 · {{ group.total }}次</span
            >
          </button>
        </div>
        <div v-if="activeExerciseGroup" class="exercise-set-grid">
          <div
            v-for="(exerciseIndex, groupIndex) in activeExerciseGroup.indices"
            :key="exerciseIndex"
            class="exercise-set-tile"
          >
            <button
              type="button"
              class="exercise-set-edit"
              :disabled="busy"
              :aria-label="`${exerciseName(activeExerciseGroup.typeId)}第${groupIndex + 1}组，${formState.exercises[exerciseIndex]?.exerciseCount == null ? '未填写' : `${formState.exercises[exerciseIndex]?.exerciseCount}次`}，编辑`"
              @click="openExerciseEditor(exerciseIndex)"
            >
              <span class="exercise-set-order">第{{ groupIndex + 1 }}组</span>
              <span class="exercise-set-value">{{
                formState.exercises[exerciseIndex]?.exerciseCount ?? '未填写'
              }}</span>
            </button>
            <button
              type="button"
              class="exercise-set-remove"
              :disabled="busy"
              :aria-label="`删除${exerciseName(activeExerciseGroup.typeId)}第${groupIndex + 1}组`"
              @click="removeExercise(exerciseIndex)"
            >
              <CloseOutlined />
            </button>
          </div>
          <button
            type="button"
            class="exercise-set-tile exercise-set-add"
            :disabled="busy"
            :aria-label="`为${exerciseName(activeExerciseGroup.typeId)}加一组`"
            @click="openExerciseEditor(-1, activeExerciseGroup.typeId)"
          >
            <PlusOutlined />
          </button>
        </div>
      </section>

      <Form.Item name="title">
        <Input
          v-model:value="formState.title"
          class="compact-title"
          placeholder="标题"
          aria-label="记录标题"
          :maxlength="50"
          @blur="handleTitleBlur"
        />
      </Form.Item>
      <Form.Item name="description">
        <Textarea
          v-model:value="formState.description"
          placeholder="描述"
          aria-label="记录备注"
          class="compact-description"
          :maxlength="200"
          :auto-size="{ minRows: 3, maxRows: 6 }"
        />
      </Form.Item>

      <AppModalFooter :busy="busy">
        <div class="compact-actions">
          <AppModalDelete
            v-if="isExistingSlot"
            title="确定删除此时间段吗？"
            :action="handleDelete"
          />
          <Button
            type="primary"
            class="compact-save"
            data-modal-confirm
            :loading="busy"
            :disabled="busy"
            @click="handleSave"
          >
            保存
          </Button>
        </div>
      </AppModalFooter>
    </Form>

    <Modal
      v-model:open="categoryModalVisible"
      aria-label="选择分类"
      :closable="false"
      :centered="true"
      :footer="false"
      width="min(95vw, 500px)"
      :destroy-on-close="true"
    >
      <div class="category-grid category-tree-grid">
        <button
          type="button"
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-grid-item"
          :class="{ active: formState.categoryId === category.id }"
          :aria-label="getDisplayName(category)"
          :aria-pressed="formState.categoryId === category.id"
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
        </button>
      </div>
    </Modal>

    <Modal
      v-model:open="exerciseEditorVisible"
      aria-label="编辑运动组"
      width="min(95vw, 360px)"
      :busy="busy"
      :destroy-on-close="true"
      @ok="saveExerciseSet"
    >
      <div class="exercise-edit-panel">
        <span class="exercise-edit-order">第{{ editingExerciseNumber }}组</span>
        <button
          type="button"
          class="exercise-type-trigger"
          aria-label="修改运动类型"
          :disabled="busy"
          @click="openExerciseTypeModal"
        >
          <component
            v-if="
              renderExerciseTypeIcon(getExerciseTypeOption(exerciseTypeDraft))
            "
            :is="
              renderExerciseTypeIcon(getExerciseTypeOption(exerciseTypeDraft))!
            "
            class="exercise-type-icon"
            :style="{ color: getExerciseTypeOption(exerciseTypeDraft)?.color }"
          />
          <span class="exercise-type-name">{{
            exerciseName(exerciseTypeDraft)
          }}</span>
          <RightOutlined class="trigger-arrow" />
        </button>
        <InputNumber
          v-model:value="exerciseCountDraft"
          class="exercise-edit-count"
          placeholder="次数"
          aria-label="运动次数"
          :min="0"
          :precision="0"
          :disabled="busy"
          :status="exerciseEditError ? 'error' : undefined"
        />
        <span
          v-if="exerciseEditError"
          role="alert"
          class="exercise-edit-error"
          >{{ exerciseEditError }}</span
        >
      </div>
      <template #footer-leading>
        <Button
          v-if="currentEditingExerciseIndex >= 0"
          type="text"
          danger
          aria-label="删除本组"
          :disabled="busy"
          @click="removeEditingExercise"
        >
          <template #icon><DeleteOutlined /></template>
        </Button>
      </template>
    </Modal>

    <Modal
      v-model:open="exerciseTypeModalVisible"
      aria-label="选择运动"
      :closable="false"
      :centered="true"
      :footer="false"
      width="min(95vw, 500px)"
      :destroy-on-close="true"
    >
      <Spin :spinning="exerciseTypesLoading">
        <div class="category-grid">
          <button
            type="button"
            v-for="option in exerciseTypeOptions"
            :key="option.value"
            class="category-grid-item"
            :class="{
              active: !addingExerciseType && exerciseTypeDraft === option.value,
            }"
            :aria-label="option.label"
            :aria-pressed="
              !addingExerciseType && exerciseTypeDraft === option.value
            "
            :disabled="busy"
            @click="handleExerciseTypeSelect(option)"
          >
            <div class="category-icon-wrapper">
              <component
                v-if="renderExerciseTypeIcon(option)"
                :is="renderExerciseTypeIcon(option)!"
                class="category-icon-large"
                :style="{ color: option.color }"
              />
              <div
                v-else
                class="category-color-dot-large"
                :style="{ backgroundColor: option.color }"
              ></div>
            </div>
            <span class="category-name-large">{{ option.label }}</span>
          </button>
          <div
            v-if="!exerciseTypesLoading && exerciseTypeOptions.length === 0"
            class="exercise-type-empty"
          >
            暂无运动类型
          </div>
        </div>
      </Spin>
    </Modal>
  </div>
</template>

<style scoped>
.time-slot-edit-form {
  padding: 0;
  user-select: none;
}

.time-slot-edit-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.time-slot-edit-form :deep(.ant-form-item:last-child) {
  margin-bottom: 0;
}

.category-inline-trigger {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  text-align: left;
  color: v-bind('token.colorText');
  background: transparent;
  border: 1px solid v-bind('token.colorBorder');
  border-radius: 12px;
  cursor: pointer;
}

.category-inline-trigger:hover {
  border-color: v-bind('token.colorPrimary');
}

.category-inline-trigger:focus-visible,
.exercise-type-trigger:focus-visible,
.category-grid-item:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

.category-icon-small {
  flex-shrink: 0;
  font-size: 22px;
}

.category-color-dot-small {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border-radius: 50%;
}

.category-name-small {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.placeholder-text,
.trigger-arrow {
  color: hsl(var(--muted-foreground));
}

.trigger-arrow {
  flex-shrink: 0;
  font-size: 14px;
}

.compact-time-range {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
  background: v-bind('token.colorFillQuaternary');
  border: 1px solid v-bind('token.colorBorder');
  border-radius: 12px;
}

.compact-time-range :deep(.compact-time-field) {
  flex: 1;
  min-width: 0;
  margin: 0;
  text-align: center;
}

.compact-time-label {
  display: block;
  color: v-bind('token.colorTextSecondary');
  font-size: 13px;
}

.compact-time-range :deep(.time-value-picker) {
  width: 100%;
  padding: 0 4px;
  background: transparent;
  border: 0;
  border-radius: 8px;
}

.compact-time-range :deep(input.time-value-picker) {
  color: v-bind('token.colorText');
  font-size: clamp(24px, 6vw, 28px);
  font-weight: 300;
  line-height: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.compact-time-summary {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 4px 4px 0;
}

.compact-duration {
  padding: 0 4px;
  color: v-bind('token.colorTextSecondary');
  font-size: 12px;
  white-space: nowrap;
}

.compact-time-arrow {
  position: relative;
  width: 100%;
  height: 1px;
  background: v-bind('token.colorTextTertiary');
}

.compact-time-arrow::after {
  position: absolute;
  top: -3px;
  right: 0;
  width: 6px;
  height: 6px;
  content: '';
  border-top: 1px solid v-bind('token.colorTextTertiary');
  border-right: 1px solid v-bind('token.colorTextTertiary');
  transform: rotate(45deg);
}

.time-slot-edit-form :deep(.compact-title) {
  min-height: 44px;
}

.time-slot-edit-form :deep(.compact-description) {
  padding: 10px 12px;
}

.time-slot-edit-form :deep(input::placeholder),
.time-slot-edit-form :deep(textarea::placeholder) {
  color: v-bind('token.colorTextSecondary');
}

.compact-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compact-actions :deep(.ant-btn) {
  min-width: 44px;
}

.compact-actions .compact-save {
  min-width: 80px;
  margin-left: auto;
}

.exercise-section {
  margin-bottom: 16px;
}

.exercise-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.exercise-action {
  min-width: 44px;
  height: 44px;
  color: v-bind('token.colorPrimary');
}

.exercise-tabs {
  display: flex;
  min-width: 0;
  gap: 12px;
  overflow-x: auto;
}

.exercise-tab {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 4px;
  min-height: 56px;
  padding: 4px 4px 8px;
  color: v-bind('token.colorTextSecondary');
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.exercise-tab.active {
  color: v-bind('token.colorPrimary');
}

.exercise-tab-heading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.exercise-tab-name {
  font-weight: 500;
  white-space: nowrap;
}

.exercise-tab-summary {
  font-size: 12px;
  white-space: nowrap;
}

.exercise-set-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.exercise-set-tile {
  position: relative;
  min-width: 0;
  min-height: 76px;
  padding: 0;
  background: v-bind('token.colorFillQuaternary');
  border: 1px solid v-bind('token.colorBorderSecondary');
  border-radius: 10px;
}

.exercise-set-edit {
  display: flex;
  width: 100%;
  min-height: 76px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  background: transparent;
  border: 0;
  border-radius: inherit;
  cursor: pointer;
}

.exercise-set-order {
  align-self: flex-start;
  padding-right: 24px;
  color: v-bind('token.colorTextSecondary');
  font-size: 12px;
}

.exercise-set-value {
  color: v-bind('token.colorText');
  font-size: 24px;
  line-height: 32px;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}

.exercise-set-remove {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  width: 44px;
  height: 44px;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 8px;
  color: v-bind('token.colorTextTertiary');
  background: transparent;
  border: 0;
  border-radius: inherit;
  cursor: pointer;
}

.exercise-set-remove:hover {
  color: v-bind('token.colorError');
}

.exercise-set-add {
  display: flex;
  align-items: center;
  justify-content: center;
  color: v-bind('token.colorPrimary');
  font-size: 20px;
  cursor: pointer;
}

.exercise-edit-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exercise-edit-order {
  color: hsl(var(--muted-foreground));
}

.exercise-type-trigger {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  text-align: left;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  cursor: pointer;
}

.exercise-type-icon {
  flex-shrink: 0;
  font-size: 18px;
}

.exercise-edit-count {
  width: 100%;
}

.exercise-edit-count :deep(.ant-input-number-input) {
  height: 44px;
  font-size: 20px;
  text-align: center;
}

.exercise-edit-error {
  color: hsl(var(--destructive));
}

.exercise-tab:focus-visible,
.exercise-set-edit:focus-visible,
.exercise-set-remove:focus-visible,
.exercise-set-add:focus-visible {
  outline: 2px solid v-bind('token.colorPrimary');
  outline-offset: -2px;
}

.exercise-type-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: hsl(var(--foreground));
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  max-height: 60vh;
  gap: 4px;
  padding: 4px;
  overflow-y: auto;
}

.category-grid-item {
  display: flex;
  min-height: 76px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}

.category-grid-item:hover {
  background: v-bind('token.colorFillQuaternary');
}

.category-grid-item.active {
  border-color: v-bind('token.colorTextSecondary');
}

.category-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  margin-bottom: 8px;
}

.category-icon-large {
  font-size: 24px;
}

.category-color-dot-large {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.category-name-large {
  font-size: 13px;
  line-height: 1.4;
  color: v-bind('token.colorText');
  text-align: center;
  overflow-wrap: anywhere;
}

.exercise-type-empty {
  grid-column: 1 / -1;
  padding: 24px;
  color: v-bind('token.colorTextSecondary');
  text-align: center;
}
</style>
