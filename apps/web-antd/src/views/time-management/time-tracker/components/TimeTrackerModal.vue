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

const title = computed(() => (isEditMode.value ? '编辑时间段' : '新增时间段'));

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
  visible.value = true;
  loading.value = true;
  isEditMode.value = !!slot;

  const targetDate = slot?.date || date || dayjs().format('YYYY-MM-DD');

  // 同步初始化 editingSlot，让页面能立即撑开
  if (isEditMode.value && slot) {
    editingSlot.value = { ...slot };
  } else {
    let initialCategoryId = defaultConfig.defaultCategoryId;
    if (
      categories.value.length > 0 &&
      !categories.value.find((c) => c.id === initialCategoryId)
    ) {
      initialCategoryId = categories.value[0]?.id || initialCategoryId;
    }

    editingSlot.value = {
      id: generateId(),
      startTime: 0,
      endTime: 30,
      categoryId: initialCategoryId,
      title: '',
      description: '',
      date: targetDate,
      exercises: [],
    };
  }

  // 异步加载数据
  const promises: Promise<void>[] = [];

  if (contextExistingSlots) {
    existingSlots.value = contextExistingSlots;
  } else {
    promises.push(
      query({ condition: { date: targetDate } })
        .then((res) => {
          existingSlots.value = Array.isArray(res) ? res : res.items || [];
        })
        .catch((error) => {
          console.error('获取已有记录失败:', error);
          existingSlots.value = [];
        }),
    );
  }

  if (isEditMode.value && slot) {
    // 编辑模式：获取详情
    promises.push(
      getById(slot.id)
        .then((detail) => {
          if (detail && editingSlot.value && editingSlot.value.id === slot.id) {
            editingSlot.value = {
              ...editingSlot.value,
              ...detail,
              exercises: detail.exercises || [],
            };
          }
        })
        .catch((error) => {
          console.error('获取详情失败', error);
        }),
    );
  } else {
    // 新增模式：获取推荐
    promises.push(
      recommendNext({ date: targetDate })
        .then((result) => {
          if (result && result.recommend && editingSlot.value) {
            editingSlot.value = {
              ...editingSlot.value,
              id: result.recommend.id || editingSlot.value.id,
              startTime: result.recommend.startTime,
              endTime: result.recommend.endTime,
              categoryId: result.recommend.categoryId,
              title: '',
              date: result.recommend.date || targetDate,
            };
          }
        })
        .catch((error) => {
          console.error('Failed to initialize modal:', error);
        }),
    );
  }

  await Promise.all(promises);
  loading.value = false;
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
        message.success('更新成功');
        visible.value = false;
        emit('success', { action: 'update', slot: newSlot });
      } else {
        await save(newSlot as any);
        message.success('记录成功');
        visible.value = false;
        emit('success', { action: 'add', slot: newSlot });
      }
    } catch (error) {
      console.error(error);
      message.error('保存失败');
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
    message.error('删除失败');
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
    :footer="null"
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <template #[editingSlot]>
        <TimeSlotEditForm
          v-if="editingSlot"
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
