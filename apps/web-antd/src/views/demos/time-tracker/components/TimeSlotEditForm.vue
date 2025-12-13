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
        <Input v-model:value="formState.title" placeholder="请输入时间段标题" />
      </Form.Item>

      <Form.Item label="分类" name="categoryId">
        <Select v-model:value="formState.categoryId" placeholder="请选择分类" @change="(value) => handleCategoryChange(value as string)">
          <Select.Option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            <div class="category-option">
              <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
              {{ category.name }}
            </div>
          </Select.Option>
        </Select>
      </Form.Item>

      <!-- 运动相关字段 -->
      <template v-if="formState.categoryId === 'exercise'">
        <Row :gutter="16">
          <Col :span="12">
            <Form.Item label="运动类型" name="exerciseTypeId">
              <Select
                v-model:value="formState.exerciseTypeId"
                placeholder="请选择运动类型"
                :options="exerciseTypeOptions"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="运动数量" name="exerciseCount">
              <InputNumber
                v-model:value="formState.exerciseCount"
                placeholder="数量"
                style="width: 100%"
                :min="0"
              />
            </Form.Item>
          </Col>
        </Row>
      </template>

      <Row :gutter="16">
        <Col :span="12">
          <Form.Item label="开始时间" name="startTime">
            <div class="time-control-group">
              <TimePicker
                v-model:value="formState.startTime"
                format="HH:mm"
                style="width: 100%"
                placeholder="选择开始时间"
              />
              <div class="time-adjust-buttons">
                <Button
                  size="small"
                  @click="adjustStartTime(-1)"
                  @mousedown="startContinuousAdjust(-1, 'start')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(-1, 'start')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.startTime"
                >-1</Button>
                <Button
                  size="small"
                  @click="adjustStartTime(1)"
                  @mousedown="startContinuousAdjust(1, 'start')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(1, 'start')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.startTime"
                >+1</Button>
                <Button
                  size="small"
                  @click="adjustStartTime(-30)"
                  @mousedown="startContinuousAdjust(-30, 'start')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(-30, 'start')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.startTime"
                >-30</Button>
                <Button
                  size="small"
                  @click="adjustStartTime(30)"
                  @mousedown="startContinuousAdjust(30, 'start')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(30, 'start')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.startTime"
                >+30</Button>
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
              />
              <div class="time-adjust-buttons">
                <Button
                  size="small"
                  @click="adjustEndTime(-1)"
                  @mousedown="startContinuousAdjust(-1, 'end')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(-1, 'end')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.endTime"
                >-1</Button>
                <Button
                  size="small"
                  @click="adjustEndTime(1)"
                  @mousedown="startContinuousAdjust(1, 'end')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(1, 'end')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.endTime"
                >+1</Button>
                <Button
                  size="small"
                  @click="adjustEndTime(-30)"
                  @mousedown="startContinuousAdjust(-30, 'end')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(-30, 'end')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.endTime"
                >-30</Button>
                <Button
                  size="small"
                  @click="adjustEndTime(30)"
                  @mousedown="startContinuousAdjust(30, 'end')"
                  @mouseup="stopContinuousAdjust"
                  @mouseleave="stopContinuousAdjust"
                  @touchstart="startContinuousAdjust(30, 'end')"
                  @touchend="stopContinuousAdjust"
                  @touchcancel="stopContinuousAdjust"
                  :disabled="!formState.endTime"
                >+30</Button>
              </div>
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="flex-shrink: 0; color: rgba(0, 0, 0, 0.88);">时长：</span>
          <InputNumber
            v-model:value="editableDuration"
            :min="1"
            :step="5"
            :precision="0"
            style="flex: 1;"
            placeholder="请输入时长"
          />
        </div>
      </Form.Item>

      <Form.Item label="描述" name="description">
        <Textarea
          v-model:value="formState.description"
          placeholder="请输入时间段描述（可选）"
          :rows="3"
        />
      </Form.Item>

      <Form.Item>
        <div class="form-actions">
          <Popconfirm
            v-if="formState.id"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Form, Input, Select, TimePicker, Button, message, Row, Col, Textarea, InputNumber, Popconfirm } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import type { TimeSlot, TimeSlotCategory, TimeSlotFormData } from '../types';
import { timeToMinutes, minutesToTime, formatDuration, getAboveSlotEndTime, getBelowSlotStartTime } from '../utils';
import { getByDictType } from '#/api/core/common';
import dayjs from 'dayjs';

interface Props {
  slot: TimeSlot;
  categories: TimeSlotCategory[];
  existingSlots?: TimeSlot[];
}

interface Emits {
  (e: 'save', data: TimeSlotFormData): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 本地表单状态接口，时间字段使用 Dayjs
interface LocalFormState {
  id?: string;
  startTime?: dayjs.Dayjs;
  endTime?: dayjs.Dayjs;
  categoryId: string;
  title: string;
  description?: string;
  exerciseTypeId?: string;
  exerciseCount?: number;
}

const formRef = ref<FormInstance>();
const formState = ref<LocalFormState>({
  id: '',
  startTime: undefined,
  endTime: undefined,
  categoryId: '',
  title: '',
  description: '',
  exerciseTypeId: undefined,
  exerciseCount: undefined
});

const exerciseTypeOptions = ref<Array<{ label: string; value: string }>>([]);

// 加载运动类型
const loadExerciseTypes = async () => {
  try {
    const res = await getByDictType('exercise_type');
    if (res && res.dictDetailList) {
      exerciseTypeOptions.value = res.dictDetailList.map((item: any) => ({
        label: item.label,
        value: item.value
      }));
    }
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

onMounted(() => {
  loadExerciseTypes();
});

// 连续调整相关变量
const continuousAdjustInterval = ref<NodeJS.Timeout | null>(null);
const continuousAdjustDirection = ref<number>(0);
const continuousAdjustType = ref<'start' | 'end'>('start');
const initialDelay = 500; // 初始延迟500ms
const repeatInterval = 100; // 重复间隔100ms

// 计算时长
const duration = computed(() => {
  if (!formState.value.startTime || !formState.value.endTime) return 0;

  const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));

  return Math.max(0, endMinutes - startMinutes);
});

// 计算时长（可编辑）
const editableDuration = computed({
  get: () => {
    if (!formState.value.startTime || !formState.value.endTime) return 0;
    const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
    const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));
    return Math.max(0, endMinutes - startMinutes);
  },
  set: (val: number) => {
    if (!formState.value.startTime) return;
    
    const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
    const proposedEndMinutes = startMinutes + val;
    
    let maxMinutes = 1439;
    
    if (props.existingSlots) {
      const tempSlot = {
        ...props.slot,
        id: formState.value.id || 'temp-id',
        startTime: startMinutes,
        endTime: startMinutes // 设置为开始时间，以便查找紧邻的下一个时间段
      };
      
      const belowStartTime = getBelowSlotStartTime(props.existingSlots, tempSlot, tempSlot.id);
      if (belowStartTime !== null) {
        maxMinutes = belowStartTime - 1; // 结束时间不能超过下一个时间段的开始时间
      }
    }
    
    // 确保结束时间不小于开始时间+1分钟，且不超过最大限制
    const finalEndMinutes = Math.max(startMinutes + 1, Math.min(maxMinutes, proposedEndMinutes));
    
    formState.value.endTime = minutesToTimePickerValue(finalEndMinutes);
  }
});

// 表单验证规则
const rules: any = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { max: 50, message: '标题不能超过50个字符', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  startTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  endTime: [
    { required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: () => {
        if (!formState.value.startTime || !formState.value.endTime) {
          return Promise.resolve();
        }

        const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
        const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));

        if (endMinutes <= startMinutes) {
          return Promise.reject(new Error('结束时间必须晚于开始时间'));
        }

        if (endMinutes - startMinutes < 1) {
          return Promise.reject(new Error('时间段不能少于1分钟'));
        }

        return Promise.resolve();
      },
      trigger: 'change'
    }
  ],
  description: [
    { max: 200, message: '描述不能超过200个字符', trigger: 'blur' }
  ]
};

// 将分钟数转换为时间选择器值
const minutesToTimePickerValue = (minutes: number) => {
  const timeStr = minutesToTime(minutes);
  return dayjs(timeStr, 'HH:mm');
};

// 初始化表单
const initializeForm = (slot: TimeSlot) => {
  formState.value = {
    id: slot.id,
    startTime: minutesToTimePickerValue(slot.startTime),
    endTime: minutesToTimePickerValue(slot.endTime),
    categoryId: slot.categoryId,
    title: slot.title,
    description: slot.description || '',
    exerciseTypeId: slot.exerciseTypeId,
    exerciseCount: slot.exerciseCount
  };
};

// 监听props变化
watch(() => props.slot, (newSlot) => {
  if (newSlot) {
    initializeForm(newSlot);
  }
}, { immediate: true });

// 处理分类变化
const handleCategoryChange = (categoryId: string) => {
  const selectedCategory = props.categories.find(cat => cat.id === categoryId);
    if (selectedCategory) {
      formState.value.title = selectedCategory.name;
    }
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
      exerciseTypeId: formState.value.exerciseTypeId,
      exerciseCount: formState.value.exerciseCount
    };

    emit('save', saveData);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 调整开始时间
const adjustStartTime = (minutes: number) => {
  if (!formState.value.startTime) return;

  const currentMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
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
      endTime: formState.value.endTime ? timeToMinutes(formState.value.endTime.format('HH:mm')) : currentMinutes + 30
    };
    
    // 获取上方最近的时间段结束时间
    // 注意：这里我们要找的是在这个slot开始时间之前最近的一个结束时间
    const aboveEndTime = getAboveSlotEndTime(props.existingSlots, tempSlot, tempSlot.id);
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
  const newMinutes = Math.max(minMinutes, Math.min(maxMinutes, proposedMinutes));
  
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
      minMinutes = timeToMinutes(formState.value.startTime.format('HH:mm')) + 1;
  }

  if (props.existingSlots && props.slot) {
      const tempSlot = {
        ...props.slot,
        id: formState.value.id || 'temp-id',
        startTime: formState.value.startTime ? timeToMinutes(formState.value.startTime.format('HH:mm')) : 0,
        endTime: currentMinutes
      };
      
      const belowStartTime = getBelowSlotStartTime(props.existingSlots, tempSlot, tempSlot.id);
      if (belowStartTime !== null) {
          // 限制：必须 < 下一个的开始时间。如果下一个开始是11:00，这里只能是10:59
          maxMinutes = belowStartTime - 1;
      }
  }

  const newMinutes = Math.max(minMinutes, Math.min(maxMinutes, proposedMinutes));
  
  formState.value.endTime = minutesToTimePickerValue(newMinutes);
};

// 开始时间取整
const roundStartTime = (direction: 'up' | 'down') => {
  if (!formState.value.startTime) return;

  const currentMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  const roundedMinutes = direction === 'down'
    ? Math.floor(currentMinutes / 60) * 60
    : Math.ceil(currentMinutes / 60) * 60;

  formState.value.startTime = minutesToTimePickerValue(roundedMinutes);

  // 如果结束时间早于新的开始时间，自动调整结束时间
  if (formState.value.endTime) {
    const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));
    if (endMinutes <= roundedMinutes) {
      formState.value.endTime = minutesToTimePickerValue(roundedMinutes + 60);
    }
  }
};

// 处理删除
const handleDelete = () => {
  if (formState.value.id) {
    emit('delete', formState.value.id);
  }
};

// 开始连续调整
const startContinuousAdjust = (direction: number, type: 'start' | 'end') => {
  // 设置连续调整参数
  continuousAdjustDirection.value = direction;
  continuousAdjustType.value = type;

  // 清除现有的定时器
  if (continuousAdjustInterval.value) {
    clearTimeout(continuousAdjustInterval.value);
    continuousAdjustInterval.value = null;
  }

  // 设置初始延迟后的连续调整（先不立即执行，等待延迟后再开始）
  continuousAdjustInterval.value = setTimeout(() => {
    // 延迟结束后先执行一次调整
    if (continuousAdjustType.value === 'start') {
      adjustStartTime(continuousAdjustDirection.value);
    } else {
      adjustEndTime(continuousAdjustDirection.value);
    }

    // 然后开始连续调整
    continuousAdjustInterval.value = setInterval(() => {
      if (continuousAdjustType.value === 'start') {
        adjustStartTime(continuousAdjustDirection.value);
      } else {
        adjustEndTime(continuousAdjustDirection.value);
      }
    }, repeatInterval);
  }, initialDelay);
};

// 停止连续调整
const stopContinuousAdjust = () => {
  if (continuousAdjustInterval.value) {
    if (typeof continuousAdjustInterval.value === 'number') {
      clearTimeout(continuousAdjustInterval.value);
    } else {
      clearTimeout(continuousAdjustInterval.value);
      clearInterval(continuousAdjustInterval.value);
    }
    continuousAdjustInterval.value = null;
  }
  continuousAdjustDirection.value = 0;
};

// 组件卸载时清理定时器
onUnmounted(() => {
  stopContinuousAdjust();
});
</script>

<style scoped>
.time-slot-edit-form {
  padding: 10px 0;
}

.category-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.duration-display {
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-weight: 500;
  color: #262626;
}

.time-control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-adjust-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.time-adjust-buttons .ant-btn {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  padding: 2px 4px;
  height: auto;
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
</style>
