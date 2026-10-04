<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form';

import type { GoalEntity } from '#/api/core/goal';
import type { ProgressStatus } from '#/api/core/progress-status';

import { ref, watch } from 'vue';

import {
  DatePicker as ADatePicker,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputNumber as AInputNumber,
  Select as ASelect,
  SelectOption as ASelectOption,
  Switch as ASwitch,
  message,
} from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

import { createGoal, deleteGoals, updateGoal } from '#/api/core/goal';
import { PROGRESS_STATUS } from '#/api/core/progress-status';
import { AppModalDelete, AppModal as Modal } from '#/components/app-modal';

const emit = defineEmits<{
  deleted: [id: string];
  saved: [record: GoalEntity];
}>();
dayjs.extend(quarterOfYear);
interface FormState {
  id?: string;
  isPinned: 0 | 1;
  title: string;
  type: number;
  status: ProgressStatus;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  startDate?: Dayjs;
  endDate?: Dayjs;
  description: string;
  tags: string;
}

// Modal & Form
const modalVisible = ref(false);
const formRef = ref();
const modalTitle = ref('添加');
const submitLoading = ref(false);

const formState = ref<FormState>({
  isPinned: 0,
  title: '',
  type: 1,
  status: PROGRESS_STATUS.NOT_STARTED,
  progress: 0,
  targetValue: undefined,
  currentValue: undefined,
  startDate: undefined,
  endDate: undefined,
  description: '',
  tags: '',
});

const rules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

const autoCalculateDates = (type: number) => {
  const now = dayjs();
  let startDate: Dayjs | undefined;
  let endDate: Dayjs | undefined;

  switch (type) {
    case 1: {
      // 日目标
      startDate = now.startOf('day');
      endDate = now.endOf('day');
      break;
    }
    case 2: {
      // 周目标
      startDate = now.startOf('week');
      endDate = now.endOf('week');
      break;
    }
    case 3: {
      // 月度目标
      startDate = now.startOf('month');
      endDate = now.endOf('month');
      break;
    }
    case 4: {
      // 季度目标
      startDate = now.startOf('quarter');
      endDate = now.endOf('quarter');
      break;
    }
    case 5: {
      // 半年目标
      const isFirstHalf = now.month() < 6;
      startDate = isFirstHalf
        ? now.month(0).startOf('month')
        : now.month(6).startOf('month');
      endDate = isFirstHalf
        ? now.month(5).endOf('month')
        : now.month(11).endOf('month');
      break;
    }
    case 6: {
      // 年度目标
      startDate = now.startOf('year');
      endDate = now.endOf('year');
      break;
    }
    case 7: {
      // 三年目标
      startDate = now.startOf('day');
      endDate = now.add(3, 'year').endOf('day');
      break;
    }
    case 8: {
      // 五年目标
      startDate = now.startOf('day');
      endDate = now.add(5, 'year').endOf('day');
      break;
    }
    case 9: {
      // 十年目标
      startDate = now.startOf('day');
      endDate = now.add(10, 'year').endOf('day');
      break;
    }
    case 10: {
      // 人生目标
      break;
    }
    default: {
      return;
    }
  }

  formState.value.startDate = startDate;
  formState.value.endDate = endDate;
};

watch(
  () => formState.value.type,
  (newType) => {
    if (newType && modalVisible.value) {
      autoCalculateDates(newType);
    }
  },
  { flush: 'sync' },
);

const handleAdd = (defaultPinned = false) => {
  modalVisible.value = false;
  modalTitle.value = '添加';
  formState.value = {
    isPinned: defaultPinned ? 1 : 0,
    title: '',
    type: 1,
    status: PROGRESS_STATUS.IN_PROGRESS,
    progress: 0,
    targetValue: undefined,
    currentValue: undefined,
    startDate: undefined,
    endDate: undefined,
    description: '',
    tags: '',
  };
  modalVisible.value = true;
};

const handleEdit = (item: GoalEntity) => {
  modalVisible.value = false;
  modalTitle.value = '编辑';

  // Parse tags if stored as JSON array string, else split by comma
  let tagsStr = '';
  try {
    if (item.tags) {
      const parsed = JSON.parse(item.tags);
      tagsStr = Array.isArray(parsed) ? parsed.join(', ') : item.tags;
    }
  } catch {
    tagsStr = item.tags || '';
  }

  formState.value = {
    id: item.id,
    isPinned: item.isPinned === 1 ? 1 : 0,
    title: item.title,
    type: item.type,
    status: item.status,
    progress: item.progress || 0,
    targetValue: item.targetValue,
    currentValue: item.currentValue,
    startDate: item.startDate ? dayjs(item.startDate) : undefined,
    endDate: item.endDate ? dayjs(item.endDate) : undefined,
    description: item.description || '',
    tags: tagsStr,
  };
  modalVisible.value = true;
};

const deleteGoal = async (id: string) => {
  try {
    await deleteGoals([id]);
    message.success('删除成功');
    modalVisible.value = false;
    emit('deleted', id);
  } catch (error) {
    console.error('Failed to delete goal:', error);
  }
};
const handleSave = async () => {
  if (submitLoading.value) return;
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    // Convert tags string to JSON array string
    const tagsArray = formState.value.tags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: GoalEntity = {
      id: formState.value.id,
      isPinned: formState.value.isPinned,
      title: formState.value.title,
      type: formState.value.type,
      status: formState.value.status,
      progress: formState.value.progress,
      targetValue: formState.value.targetValue,
      currentValue: formState.value.currentValue,
      startDate: formState.value.startDate?.format('YYYY-MM-DD HH:mm:ss'),
      endDate: formState.value.endDate?.format('YYYY-MM-DD HH:mm:ss'),
      description: formState.value.description,
      tags: JSON.stringify(tagsArray),
    };

    const saved = formState.value.id
      ? await updateGoal(payload)
      : await createGoal(payload);
    emit('saved', saved);

    modalVisible.value = false;
  } catch (error) {
    console.error('Validate Failed:', error);
  } finally {
    submitLoading.value = false;
  }
};

defineExpose({
  open(item?: GoalEntity, defaultPinned = false) {
    if (item) handleEdit(item);
    else handleAdd(defaultPinned);
  },
});
</script>
<template>
  <Modal
    v-model:open="modalVisible"
    :confirm-loading="submitLoading"
    @ok="handleSave"
    width="600px"
  >
    <template #footer-leading>
      <AppModalDelete
        v-if="modalTitle === '编辑'"
        :disabled="submitLoading"
        title="确定删除这个目标吗？"
        :action="() => deleteGoal(formState.id!)"
      />
    </template>
    <AForm ref="formRef" :model="formState" :rules="rules" layout="vertical">
      <AFormItem label="目标标题" name="title">
        <AInput
          v-model:value="formState.title"
          placeholder="请输入目标标题"
          allow-clear
        />
      </AFormItem>

      <div class="flex gap-4">
        <AFormItem label="类型" name="type" class="flex-1">
          <ASelect v-model:value="formState.type" placeholder="请选择">
            <ASelectOption :value="1">日</ASelectOption>
            <ASelectOption :value="2">周</ASelectOption>
            <ASelectOption :value="3">月</ASelectOption>
            <ASelectOption :value="4">季度</ASelectOption>
            <ASelectOption :value="5">半年</ASelectOption>
            <ASelectOption :value="6">年度</ASelectOption>
            <ASelectOption :value="7">三年</ASelectOption>
            <ASelectOption :value="8">五年</ASelectOption>
            <ASelectOption :value="9">十年</ASelectOption>
            <ASelectOption :value="10">终生</ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem label="状态" name="status" class="flex-1">
          <ASelect v-model:value="formState.status" placeholder="请选择">
            <ASelectOption :value="PROGRESS_STATUS.NOT_STARTED">
              <span class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-gray-400"></span>
                待开始
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.IN_PROGRESS">
              <span class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                进行中
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.COMPLETED">
              <span class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-green-500"></span>
                已完成
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.ON_HOLD">
              <span class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-orange-500"></span>
                搁置
              </span>
            </ASelectOption>
          </ASelect>
        </AFormItem>
      </div>

      <div class="flex gap-4">
        <AFormItem label="当前值" name="currentValue" class="flex-1">
          <AInputNumber
            v-model:value="formState.currentValue"
            :min="0"
            placeholder="当前值"
            class="w-full"
          />
        </AFormItem>
        <AFormItem label="目标值" name="targetValue" class="flex-1">
          <AInputNumber
            v-model:value="formState.targetValue"
            :min="0"
            placeholder="目标值"
            class="w-full"
          />
        </AFormItem>
      </div>

      <div class="flex gap-4">
        <AFormItem label="开始" name="startDate" class="flex-1">
          <ADatePicker
            v-model:value="formState.startDate"
            class="w-full"
            placeholder="可选"
            show-time
          />
        </AFormItem>

        <AFormItem label="结束" name="endDate" class="flex-1">
          <ADatePicker
            v-model:value="formState.endDate"
            class="w-full"
            placeholder="可选"
            show-time
          />
        </AFormItem>
      </div>

      <AFormItem label="标签" name="tags">
        <AInput
          v-model:value="formState.tags"
          placeholder="多个标签用逗号分隔"
          allow-clear
        />
      </AFormItem>

      <AFormItem label="描述" name="description">
        <AInput
          v-model:value="formState.description"
          placeholder="请输入描述..."
          allow-clear
        />
      </AFormItem>
      <AFormItem label="添加到首页" name="isPinned">
        <ASwitch
          v-model:checked="formState.isPinned"
          :checked-value="1"
          :un-checked-value="0"
        />
      </AFormItem>
    </AForm>
  </Modal>
</template>
