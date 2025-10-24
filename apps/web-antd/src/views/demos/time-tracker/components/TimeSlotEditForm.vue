<template>
  <div class="time-slot-edit-form">
    <a-form
      ref="formRef"
      :model="formState"
      :rules="rules"
      layout="vertical"
      @finish="handleSave"
    >
      <a-form-item label="标题" name="title">
        <a-input v-model:value="formState.title" placeholder="请输入时间段标题" />
      </a-form-item>

      <a-form-item label="分类" name="categoryId">
        <a-select v-model:value="formState.categoryId" placeholder="请选择分类">
          <a-select-option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            <div class="category-option">
              <div class="color-indicator" :style="{ backgroundColor: category.color }"></div>
              {{ category.name }}
            </div>
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="开始时间" name="startTime">
            <a-time-picker
              v-model:value="formState.startTime"
              format="HH:mm"
              :minute-step="15"
              style="width: 100%"
              placeholder="选择开始时间"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="结束时间" name="endTime">
            <a-time-picker
              v-model:value="formState.endTime"
              format="HH:mm"
              :minute-step="15"
              style="width: 100%"
              placeholder="选择结束时间"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="时长">
        <div class="duration-display">
          {{ formatDuration(duration) }}
        </div>
      </a-form-item>

      <a-form-item label="描述" name="description">
        <a-textarea
          v-model:value="formState.description"
          placeholder="请输入时间段描述（可选）"
          :rows="3"
        />
      </a-form-item>

      <a-form-item>
        <div class="form-actions">
          <a-button type="primary" html-type="submit">保存</a-button>
          <a-button @click="$emit('cancel')" style="margin-left: 8px">取消</a-button>
          <a-button
            danger
            @click="handleDelete"
            style="margin-left: auto"
            v-if="formState.id"
          >
            删除
          </a-button>
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import type { TimeSlot, TimeSlotCategory, TimeSlotFormData } from '../types';
import { timeToMinutes, minutesToTime, formatDuration } from '../utils';
import dayjs from 'dayjs';

interface Props {
  slot: TimeSlot;
  categories: TimeSlotCategory[];
}

interface Emits {
  (e: 'save', data: TimeSlotFormData): void;
  (e: 'delete', id: string): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formRef = ref<FormInstance>();
const formState = ref<TimeSlotFormData>({
  id: '',
  startTime: undefined,
  endTime: undefined,
  categoryId: '',
  title: '',
  description: ''
});

// 计算时长
const duration = computed(() => {
  if (!formState.value.startTime || !formState.value.endTime) return 0;
  
  const startMinutes = timeToMinutes(formState.value.startTime.format('HH:mm'));
  const endMinutes = timeToMinutes(formState.value.endTime.format('HH:mm'));
  
  return Math.max(0, endMinutes - startMinutes);
});

// 表单验证规则
const rules = {
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
        
        if (endMinutes - startMinutes < 15) {
          return Promise.reject(new Error('时间段不能少于15分钟'));
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
    description: slot.description || ''
  };
};

// 监听props变化
watch(() => props.slot, (newSlot) => {
  if (newSlot) {
    initializeForm(newSlot);
  }
}, { immediate: true });

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
      description: formState.value.description
    };
    
    emit('save', saveData);
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 处理删除
const handleDelete = () => {
  if (formState.value.id) {
    emit('delete', formState.value.id);
  }
};
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