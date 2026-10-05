<script setup lang="ts">
import type { TimeSlot, TimeSlotFormData } from '../types';

import { computed, onMounted, onUnmounted, ref, useId } from 'vue';

import { createIconifyIcon } from '@vben/icons';

import { DatePicker, message, Spin } from 'ant-design-vue';
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
import { AppModal as Modal } from '#/components/app-modal';

import { defaultConfig } from '../config';
import { hasOverlap, isValidSlot } from '../utils';
import TimeSlotEditForm from './TimeSlotEditForm.vue';

const emit = defineEmits(['success']);
const CalendarIcon = createIconifyIcon('lucide:calendar');
const dateInputId = useId();

const visible = ref(false);
const loading = ref(false);
const editingSlot = ref<null | TimeSlot>(null);
const existingSlots = ref<TimeSlot[]>([]);
const isMobile = ref(window.innerWidth < 1024);
const categories = ref(defaultConfig.categories);
const isEditMode = ref(false);
const centeredMessageStyle = {
  position: 'fixed' as const,
  // message 容器位于视口顶部 8px，且 transform 会建立定位包含块。
  top: 'calc(50dvh - 8px)',
  left: 0,
  width: '100%',
  transform: 'translateY(-50%)',
};

// 加载分类配置
const loadCategories = async () => {
  try {
    const data = await listCategories(true);
    if (data) {
      categories.value = data.map((cat) => {
        const isPublic = Number(cat.userId) === 0;
        const isOverride = !!cat.templateId;
        return {
          id: cat.id as string,
          parentId: cat.parentId,
          realId: cat.id as string,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          description: cat.description,
          isTrackTime: cat.isTrackTime === 1,
          categoryType: isPublic ? 'public' : isOverride ? 'public' : 'private',
          isOverridden: isOverride,
          isHidden: cat.isEnabled === 0,
          originalId: cat.templateId?.toString() || cat.id,
          sort: cat.sort,
        };
      }) as any;
    }
  } catch (error) {
    console.error('加载分类配置失败:', error);
  }
};

const dateFormat = computed(() => {
  const date = dayjs(editingSlot.value?.date);
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
    date.day()
  ];
  return `${date.year() === dayjs().year() ? '' : 'YYYY年'}M月D日 [${weekday}]`;
});

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
  if (loading.value) return;

  loading.value = true;
  isEditMode.value = !!slot;

  const targetDate = slot?.date || date || dayjs().format('YYYY-MM-DD');

  // 新增先检查剩余时间，避免全天已满或请求失败时展示默认表单。
  if (!slot) {
    visible.value = false;
    editingSlot.value = null;
    const hideLoading = message.open({
      type: 'loading',
      content: '',
      duration: 0,
      style: centeredMessageStyle,
    });
    try {
      const result = await recommendNext({ date: targetDate });
      if (!result.recommend) {
        message.info({
          content: '该天已录入完毕',
          style: centeredMessageStyle,
        });
        return;
      }

      existingSlots.value = result.records
        ? result.records.map((record) => ({ ...record, date: targetDate }))
        : contextExistingSlots || [];
      editingSlot.value = {
        id: '',
        startTime: result.recommend.startTime,
        endTime: result.recommend.endTime,
        categoryId: result.recommend.categoryId,
        title: '',
        description: '',
        date: result.recommend.date || targetDate,
        exercises: [],
      };
      visible.value = true;
    } catch (error) {
      console.error('Failed to initialize modal:', error);
    } finally {
      hideLoading();
      loading.value = false;
    }
    return;
  }

  visible.value = true;
  editingSlot.value = { ...slot };

  // 异步加载数据
  const promises: Promise<void>[] = [];

  if (contextExistingSlots) {
    existingSlots.value = contextExistingSlots;
  } else {
    promises.push(
      query({ condition: { date: targetDate } })
        .then((res) => {
          existingSlots.value = res;
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
  }

  await Promise.all(promises);
  loading.value = false;
};

const handleDateChange = async (value: unknown) => {
  if (loading.value || isEditMode.value || !editingSlot.value || !value) return;
  const targetDate = String(value);
  if (targetDate === editingSlot.value.date) return;

  loading.value = true;
  try {
    const result = await recommendNext({ date: targetDate });
    if (!result.recommend) {
      message.info({
        content: '该天已录入完毕',
        style: centeredMessageStyle,
      });
      return;
    }
    existingSlots.value = result.records.map((record) => ({
      ...record,
      date: targetDate,
    }));
    editingSlot.value = {
      ...editingSlot.value,
      date: targetDate,
      startTime: result.recommend.startTime,
      endTime: result.recommend.endTime,
    };
  } catch (error) {
    console.error('切换录入日期失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  if (loading.value) return;
  visible.value = false;
  editingSlot.value = null;
};

const handleSave = async (formData: TimeSlotFormData) => {
  if (loading.value) return;
  const targetDate = editingSlot.value?.date || dayjs().format('YYYY-MM-DD');

  const newSlot: TimeSlot = {
    id: isEditMode.value ? editingSlot.value!.id : '',
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
        const { id: _id, ...payload } = newSlot;
        newSlot.id = await save(payload);
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
    aria-label="时迹录入"
    class="time-record-modal"
    width="min(95vw, 440px)"
    :busy="loading"
    :keyboard="!loading"
    :mask-closable="!loading"
    :closable="false"
    :footer="null"
    centered
    @cancel="handleCancel"
  >
    <Spin :spinning="loading">
      <template #default>
        <div v-if="editingSlot" class="record-date-row">
          <CalendarIcon class="record-date-icon" aria-hidden="true" />
          <label :for="dateInputId" class="sr-only">录入日期</label>
          <DatePicker
            :id="dateInputId"
            :value="editingSlot.date"
            value-format="YYYY-MM-DD"
            :format="dateFormat"
            :allow-clear="false"
            :disabled="loading || isEditMode"
            :input-read-only="isMobile"
            :bordered="false"
            :suffix-icon="null"
            class="record-date-picker"
            @change="handleDateChange"
          />
        </div>
        <TimeSlotEditForm
          v-if="editingSlot"
          v-bind="{ slot: editingSlot }"
          :categories="categories"
          :busy="loading"
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

.record-date-row {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 12px;
  padding: 4px 12px;
  margin-bottom: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
}

.record-date-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: hsl(var(--muted-foreground));
  font-size: 22px;
}

.record-date-row :deep(.record-date-picker) {
  flex: 1;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: 0;
}

.record-date-row :deep(input) {
  color: hsl(var(--foreground));
}
</style>
<style>
.time-record-modal .app-modal-body {
  padding: var(--app-modal-padding-top) 16px 0;
}

.time-record-modal .app-modal-footer {
  padding: 20px 16px 16px;
}
</style>
