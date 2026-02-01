<template>
  <Modal
    v-model:open="visible"
    :title="title"
    :width="isMobile ? '95vw' : 600"
    :footer="null"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <TimeSlotEditForm
        v-if="editingSlot"
        :slot="editingSlot"
        :categories="categories"
        :existing-slots="existingSlots"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </Spin>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Modal, Spin, message } from 'ant-design-vue';
import dayjs from 'dayjs';
import TimeSlotEditForm from './TimeSlotEditForm.vue';
import { defaultConfig, getCategoryName } from '../config';
import { generateId, isValidSlot, hasOverlap } from '../utils';
import { recommendNext, save } from '#/api/core/time-tracker';
import type { TimeSlot, TimeSlotFormData } from '../types';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const editingSlot = ref<TimeSlot | null>(null);
const existingSlots = ref<TimeSlot[]>([]);
const isMobile = ref(window.innerWidth < 768);
const categories = ref(defaultConfig.categories);

const title = computed(() => '快速记录');

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  window.addEventListener('resize', updateIsMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
});

const open = async () => {
  visible.value = true;
  loading.value = true;
  const currentDate = dayjs().format('YYYY-MM-DD');

  // Initialize new slot
  const initialCategoryId = defaultConfig.defaultCategoryId;
  const newSlot: TimeSlot = {
    id: generateId(),
    startTime: 0,
    endTime: 30,
    categoryId: initialCategoryId,
    title: '',
    description: '',
    date: currentDate,
  };
  editingSlot.value = newSlot;

  try {
    // Recommend next and get existing records in one call
    const result = await recommendNext({ date: currentDate });
    if (result) {
        const { recommend, records } = result;
        
        // Update existing slots from the records returned
        if (Array.isArray(records)) {
          existingSlots.value = records;
        } else {
          existingSlots.value = [];
        }

        if (recommend) {
          editingSlot.value = {
                ...newSlot,
                id: recommend.id || newSlot.id,
                startTime: recommend.startTime,
                endTime: recommend.endTime,
                categoryId: recommend.categoryId,
                title: '',
                date: recommend.date || currentDate,
              };
        }
    }
  } catch (e) {
      console.error('Failed to initialize modal:', e);
  } finally {
      loading.value = false;
  }
};

const handleCancel = () => {
  visible.value = false;
  editingSlot.value = null;
};

const handleSave = async (formData: TimeSlotFormData) => {
    const targetDate = editingSlot.value?.date || dayjs().format('YYYY-MM-DD');
    
    const newSlot: TimeSlot = {
      id: formData.id || generateId(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      categoryId: formData.categoryId,
      title: formData.title,
      description: formData.description || '',
      date: targetDate,
      exerciseTypeId: formData.exerciseTypeId,
      exerciseCount: formData.exerciseCount,
    };

    // Filter slots for the same day to check overlap
    const sameDaySlots = existingSlots.value.filter(s => s.date === targetDate);

    if (isValidSlot(newSlot) && !hasOverlap(sameDaySlots, newSlot)) {
        try {
            await save(newSlot);
            message.success('记录成功');
            visible.value = false;
            emit('success');
        } catch(e) {
            console.error(e);
            message.error('保存失败');
        }
    } else {
        message.error('时间段无效或重叠');
    }
};

defineExpose({ open });
</script>
