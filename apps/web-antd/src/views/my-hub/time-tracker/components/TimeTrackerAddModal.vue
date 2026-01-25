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
import { recommendNext, save, query } from '#/api/core/time-tracker';
import type { TimeSlot, TimeSlotFormData } from '../types';

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
    title: getCategoryName(initialCategoryId, categories.value),
    description: '',
    date: currentDate,
  };
  editingSlot.value = newSlot;

  try {
    // Fetch existing slots for today to check overlaps
    // Note: query returns array of slots or QueryResponse
    const response = await query({ condition: { date: currentDate } });
    if (Array.isArray(response)) {
      existingSlots.value = response;
    } else if (response && (response as any).items) {
      existingSlots.value = (response as any).items || [];
    } else {
      existingSlots.value = [];
    }

    // Recommend next
    const result = await recommendNext({ date: currentDate });
    if (result) {
        editingSlot.value = {
            ...newSlot,
            startTime: result.startTime,
            endTime: result.endTime,
            categoryId: result.categoryId,
            title: getCategoryName(result.categoryId, categories.value),
            date: result.date || currentDate,
        };
        
        // If date changed, fetch slots for that date
        if (result.date && result.date !== currentDate) {
             const newResponse = await query({ condition: { date: result.date } });
             if (Array.isArray(newResponse)) {
                existingSlots.value = newResponse;
              } else if (newResponse && (newResponse as any).items) {
                existingSlots.value = (newResponse as any).items || [];
              } else {
                existingSlots.value = [];
              }
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

    if (!newSlot.title) {
         newSlot.title = getCategoryName(newSlot.categoryId, categories.value);
    }

    // Filter slots for the same day to check overlap
    const sameDaySlots = existingSlots.value.filter(s => s.date === targetDate);

    if (isValidSlot(newSlot) && !hasOverlap(sameDaySlots, newSlot)) {
        try {
            await save(newSlot);
            message.success('记录成功');
            visible.value = false;
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
