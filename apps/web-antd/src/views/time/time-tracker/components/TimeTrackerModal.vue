<script setup lang="ts">
import type { TimeSlot, TimeSlotFormData } from '../types';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import { message, Modal, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteData,
  getById,
  query,
  recommendNext,
  save,
  update,
} from '#/api/core/time-tracker';
import { listCategories } from '#/api/core/time-tracker-category';

import { defaultConfig } from '../config';
import { generateId, hasOverlap, isValidSlot } from '../utils';
import TimeSlotEditForm from './TimeSlotEditForm.vue';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const opening = ref(false);
const editingSlot = ref<null | TimeSlot>(null);
const existingSlots = ref<TimeSlot[]>([]);
const isMobile = ref(window.innerWidth < 1024);
const categories = ref(defaultConfig.categories);
const isEditMode = ref(false);

// 加载分类配置
const loadCategories = async () => {
  try {
    const data = await listCategories();
    if (data) {
      categories.value = data.map((cat) => {
        const isPublic = Number(cat.userId) === 0;
        const isOverride = !!cat.templateId;
        return {
          id: cat.id as string,
          realId: cat.id as string,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          description: cat.description,
          isTrackTime: cat.isTrackTime === 1,
          categoryType: isPublic ? 'public' : isOverride ? 'public' : 'private',
          isOverridden: isOverride,
          isHidden: false,
          originalId: cat.templateId?.toString() || cat.id,
          sort: cat.sort,
        };
      }) as any;
    }
  } catch (error) {
    console.error('加载分类配置失败:', error);
  }
};

const title = computed(() => '');

const updateIsMobile = () => {
  isMobile.value = window.innerWidth < 1024;
};

onMounted(() => {
  window.addEventListener('resize', updateIsMobile);
  loadCategories();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
});

const open = async (
  slot?: TimeSlot,
  date?: string,
  contextExistingSlots?: TimeSlot[],
) => {
  if (opening.value) return;
  opening.value = true;
  loading.value = true;
  isEditMode.value = !!slot;

  const targetDate = slot?.date || date || dayjs().format('YYYY-MM-DD');
  // 新增先检查可用区间，等待期间只显示加载提示，不先弹出表单。
  const hideLoading = slot ? undefined : message.loading('加载中', 0);

  try {
    if (slot) {
      editingSlot.value = { ...slot };
      visible.value = true;
    } else {
      visible.value = false;
      editingSlot.value = null;
      const result = await recommendNext({ date: targetDate });
      if (!result.recommend) {
        hideLoading?.();
        message.info('当天已记满，没有可添加的时间段');
        return;
      }

      const initialCategoryId = categories.value.some(
        (category) => category.id === defaultConfig.defaultCategoryId,
      )
        ? defaultConfig.defaultCategoryId
        : categories.value[0]?.id || defaultConfig.defaultCategoryId;
      editingSlot.value = {
        id: result.recommend.id || generateId(),
        startTime: result.recommend.startTime,
        endTime: result.recommend.endTime,
        categoryId: result.recommend.categoryId || initialCategoryId,
        title: '',
        description: '',
        date: result.recommend.date || targetDate,
        exercises: [],
      };
    }

    const promises: Promise<void>[] = [];
    if (contextExistingSlots) {
      existingSlots.value = contextExistingSlots;
    } else {
      promises.push(
        query({ condition: { date: targetDate } }).then((res) => {
          existingSlots.value = Array.isArray(res) ? res : res.items || [];
        }),
      );
    }

    if (slot) {
      promises.push(
        getById(slot.id).then((detail) => {
          if (detail && editingSlot.value?.id === slot.id) {
            editingSlot.value = {
              ...editingSlot.value,
              ...detail,
              exercises: detail.exercises || [],
            };
          }
        }),
      );
    }

    await Promise.all(promises);
    if (!slot) visible.value = true;
  } catch (error) {
    console.error('加载时间段失败:', error);
    // 请求失败由全局拦截器提示；新增时保持弹窗关闭。
  } finally {
    hideLoading?.();
    loading.value = false;
    opening.value = false;
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
    exercises: formData.exercises,
    relateId: formData.relateId,
    relateType: formData.relateType,
  };

  // 检查重叠时，只考虑同一天内的时间段，且排除当前正在编辑的记录
  const sameDaySlots = existingSlots.value.filter(
    (s) => s.date === targetDate && s.id !== newSlot.id,
  );

  if (isValidSlot(newSlot) && !hasOverlap(sameDaySlots, newSlot)) {
    try {
      loading.value = true;
      if (isEditMode.value) {
        await update(newSlot as any);
        visible.value = false;
        emit('success', { action: 'update', slot: newSlot });
      } else {
        await save(newSlot as any);
        visible.value = false;
        emit('success', { action: 'add', slot: newSlot });
      }
    } catch (error) {
      console.error(error);
      // 全局拦截器已提示
    } finally {
      loading.value = false;
    }
  } else {
    message.error('时间段无效或重叠');
  }
};

const handleDelete = async (slotId: string) => {
  try {
    loading.value = true;
    await deleteData({ id: slotId });
    message.success('删除成功');
    visible.value = false;
    emit('success', { action: 'delete', id: slotId });
  } catch (error) {
    console.error('删除失败:', error);
    // 全局拦截器已提示
  } finally {
    loading.value = false;
  }
};

defineExpose({ open });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="title"
    :width="isMobile ? '95vw' : 600"
    :closable="false"
    :footer="null"
    centered
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <template #default>
        <TimeSlotEditForm
          v-if="editingSlot"
          v-bind="{ slot: editingSlot }"
          :categories="categories"
          :existing-slots="existingSlots"
          @save="handleSave"
          @delete="handleDelete"
          @cancel="handleCancel"
        />
      </template>
    </Spin>
  </Modal>
</template>

<style scoped>
:deep(.ant-modal-content) {
  user-select: none;
}
</style>
