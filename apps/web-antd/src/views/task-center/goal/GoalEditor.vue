<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form';

import type { VariableValue } from './query-variables';

import type { GoalEntity } from '#/api/core/goal';
import type { ProgressStatus } from '#/api/core/progress-status';

import { computed, ref, watch } from 'vue';

import {
  Button as AButton,
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

import {
  createGoal,
  deleteGoals,
  previewGoalProgress,
  refreshGoalRows,
  updateGoal,
} from '#/api/core/goal';
import { PROGRESS_STATUS } from '#/api/core/progress-status';
import { AppModalDelete, AppModal as Modal } from '#/components/app-modal';

import {
  queryVariables,
  readVariableValues,
  variableKind,
  variableSources,
  writeVariableValues,
} from './query-variables';

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
  progressMode: 'graphql' | 'manual';
  progressQuery: string;
  progressVariables: string;
  progressVariableBindings: string;
  progressValuePath: string;
  targetOperator: 'gt' | 'gte';
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
const previewLoading = ref(false);
const previewText = ref('');
const queryError = ref('');
const variableValues = ref<Record<string, VariableValue>>({});
const variableDefinition = computed(() => {
  try {
    return { fields: queryVariables(formState.value.progressQuery), error: '' };
  } catch (error) {
    return { fields: [], error: (error as Error).message };
  }
});
function resetVariables() {
  try {
    variableValues.value = readVariableValues(
      formState.value.progressQuery,
      formState.value.progressVariables,
      formState.value.progressVariableBindings,
    );
  } catch (error) {
    variableValues.value = {};
    queryError.value = (error as Error).message;
  }
}
function queryPayload() {
  const form = formState.value;
  if (
    form.progressMode === 'graphql' &&
    (!form.progressQuery.trim() || !form.progressValuePath.trim())
  )
    throw new Error('请填写查询和结果路径');
  return {
    progressMode: form.progressMode,
    progressQuery: form.progressQuery,
    progressVariables: form.progressVariables,
    progressVariableBindings: form.progressVariableBindings,
    ...(form.progressMode === 'graphql'
      ? writeVariableValues(form.progressQuery, variableValues.value)
      : {}),
    progressValuePath: form.progressValuePath,
    targetOperator: form.targetOperator,
  };
}
async function previewQuery() {
  if (previewLoading.value) return;
  previewLoading.value = true;
  previewText.value = '';
  queryError.value = '';
  try {
    const stamp = JSON.stringify([formState.value, variableValues.value]);
    const result = await previewGoalProgress({
      ...queryPayload(),
      targetValue: formState.value.targetValue,
      startDate: formState.value.startDate?.format('YYYY-MM-DD HH:mm:ss'),
      endDate: formState.value.endDate?.format('YYYY-MM-DD HH:mm:ss'),
    });
    if (
      !modalVisible.value ||
      JSON.stringify([formState.value, variableValues.value]) !== stamp
    )
      return;
    previewText.value = `当前值 ${result.currentValue} · ${result.progressPercent}% · ${result.achieved ? '已达标' : '未达标'}`;
  } catch (error) {
    queryError.value = error instanceof Error ? error.message : '预览失败';
  } finally {
    previewLoading.value = false;
  }
}

const formState = ref<FormState>({
  isPinned: 0,
  title: '',
  type: 1,
  status: PROGRESS_STATUS.NOT_STARTED,
  progress: 0,
  targetValue: undefined,
  currentValue: undefined,
  progressMode: 'manual',
  progressQuery: '',
  progressVariables: '{}',
  progressVariableBindings: '{}',
  progressValuePath: '',
  targetOperator: 'gte',
  startDate: undefined,
  endDate: undefined,
  description: '',
  tags: '',
});

watch(
  variableValues,
  () => {
    previewText.value = '';
    queryError.value = '';
  },
  { deep: true },
);
watch(variableDefinition, ({ fields }) => {
  for (const variable of fields) {
    variableValues.value[variable.name] ??= {
      source: 'fixed',
      value: '',
    };
  }
});

watch(
  formState,
  () => {
    previewText.value = '';
    queryError.value = '';
  },
  { deep: true },
);

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
    progressMode: 'manual',
    progressQuery: '',
    progressVariables: '{}',
    progressVariableBindings: '{}',
    progressValuePath: '',
    targetOperator: 'gte',
    startDate: undefined,
    endDate: undefined,
    description: '',
    tags: '',
  };
  resetVariables();
  modalVisible.value = true;
};

const handleEdit = (item: GoalEntity) => {
  modalVisible.value = false;
  modalTitle.value = '编辑';

  // 标签在表单中按逗号分隔文本编辑
  const tagsStr = (item.tags ?? []).join(', ');
  formState.value = {
    id: item.id,
    isPinned: item.isPinned === 1 ? 1 : 0,
    title: item.title,
    type: item.type,
    status: item.status,
    progress: item.progress || 0,
    targetValue: item.targetValue,
    currentValue: item.currentValue,
    progressMode: item.progressMode ?? 'manual',
    progressQuery: item.progressQuery ?? '',
    progressVariables: item.progressVariables ?? '{}',
    progressVariableBindings: item.progressVariableBindings ?? '{}',
    progressValuePath: item.progressValuePath ?? '',
    targetOperator: item.targetOperator ?? 'gte',
    startDate: item.startDate ? dayjs(item.startDate) : undefined,
    endDate: item.endDate ? dayjs(item.endDate) : undefined,
    description: item.description || '',
    tags: tagsStr,
  };
  resetVariables();
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
  if (submitLoading.value || previewLoading.value) return;
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    // 标签按逗号分隔文本编辑，提交时转为字符串数组
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
      currentValue:
        formState.value.progressMode === 'manual'
          ? formState.value.currentValue
          : undefined,
      ...queryPayload(),
      startDate: formState.value.startDate?.format('YYYY-MM-DD HH:mm:ss'),
      endDate: formState.value.endDate?.format('YYYY-MM-DD HH:mm:ss'),
      description: formState.value.description,
      tags: tagsArray,
    };

    const saved = formState.value.id
      ? await updateGoal({ ...payload, id: formState.value.id })
      : await createGoal(payload);
    const [refreshed] = await refreshGoalRows([saved]);
    emit('saved', refreshed!);

    modalVisible.value = false;
  } catch (error) {
    queryError.value =
      error instanceof Error ? error.message : '请检查目标配置';
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
    :closable="!previewLoading"
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
              <span class="inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-gray-400"></span>
                待开始
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.IN_PROGRESS">
              <span class="inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-blue-500"></span>
                进行中
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.COMPLETED">
              <span class="inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-green-500"></span>
                已完成
              </span>
            </ASelectOption>
            <ASelectOption :value="PROGRESS_STATUS.ON_HOLD">
              <span class="inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-orange-500"></span>
                搁置
              </span>
            </ASelectOption>
          </ASelect>
        </AFormItem>
      </div>

      <AFormItem label="进度来源">
        <ASelect v-model:value="formState.progressMode" aria-label="进度来源">
          <ASelectOption value="manual">手动填写</ASelectOption>
          <ASelectOption value="graphql">GraphQL 查询</ASelectOption>
        </ASelect>
      </AFormItem>
      <div class="flex flex-wrap gap-4">
        <AFormItem
          v-if="formState.progressMode === 'manual'"
          label="当前值"
          name="currentValue"
          class="flex-1"
        >
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

      <AFormItem label="达标条件">
        <ASelect v-model:value="formState.targetOperator" aria-label="达标条件">
          <ASelectOption value="gte">达到目标值（≥）</ASelectOption>
          <ASelectOption value="gt">超过目标值（＞）</ASelectOption>
        </ASelect>
      </AFormItem>
      <template v-if="formState.progressMode === 'graphql'">
        <AFormItem label="GraphQL 查询">
          <AInput.TextArea
            v-model:value="formState.progressQuery"
            aria-label="GraphQL 查询"
            :rows="7"
            placeholder="query { ... }"
          />
        </AFormItem>
        <p
          v-if="variableDefinition.error"
          role="alert"
          class="text-destructive"
        >
          {{ variableDefinition.error }}
        </p>
        <AFormItem
          v-for="variable in variableDefinition.fields"
          :key="variable.name"
          :label="variable.name"
          :required="variable.required"
        >
          <div class="flex flex-col gap-2" v-if="variableValues[variable.name]">
            <ASelect
              v-if="variable.type.replaceAll('!', '') === 'String'"
              v-model:value="variableValues[variable.name]!.source"
              :aria-label="`${variable.name}来源`"
              :options="variableSources"
            />
            <template v-if="variableValues[variable.name]!.source === 'fixed'">
              <ASelect
                v-if="variableKind(variable) === 'boolean'"
                v-model:value="variableValues[variable.name]!.value"
                :aria-label="variable.name"
                :options="[
                  { label: '是', value: 'true' },
                  { label: '否', value: 'false' },
                ]"
              />
              <AInput.TextArea
                v-else-if="variableKind(variable) === 'json'"
                v-model:value="variableValues[variable.name]!.value"
                :aria-label="variable.name"
                :rows="3"
                placeholder="填写对象或列表"
              />
              <AInput
                v-else
                v-model:value="variableValues[variable.name]!.value"
                :aria-label="variable.name"
                :type="variableKind(variable) === 'number' ? 'number' : 'text'"
                :placeholder="`请输入${variable.name}`"
              />
            </template>
          </div>
        </AFormItem>
        <AFormItem
          label="结果路径"
          help="相对于 data，例如 progress.exerciseCount.max；已存在字段的 null 按空集合计为 0"
        >
          <AInput
            v-model:value="formState.progressValuePath"
            aria-label="结果路径"
          />
        </AFormItem>
        <AButton
          :loading="previewLoading"
          :disabled="submitLoading"
          @click="previewQuery"
        >
          执行预览
        </AButton>
        <pre
          v-if="previewText"
          role="status"
          class="mt-2 whitespace-pre-wrap break-all text-sm text-muted-foreground"
          >{{ previewText }}</pre
        >
      </template>
      <p v-if="queryError" role="alert" class="text-destructive">
        {{ queryError }}
      </p>
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
      <AFormItem label="固定到首页" name="isPinned">
        <ASwitch
          v-model:checked="formState.isPinned"
          :checked-value="1"
          :un-checked-value="0"
        />
      </AFormItem>
    </AForm>
  </Modal>
</template>
