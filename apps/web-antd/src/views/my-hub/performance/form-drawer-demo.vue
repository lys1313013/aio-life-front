<script lang="ts" setup>
import { computed, onMounted, ref, toRaw, watch } from 'vue';

import { DeleteOutlined } from '@ant-design/icons-vue';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getByDictType } from '#/api/core/common';
import {
  createPerformance,
  deletePerformance,
  updatePerformance,
  uploadPerformanceAttachment,
} from '#/api/core/performance';
import ImageUpload from '#/components/ImageUpload.vue';

defineOptions({
  name: 'FormDrawerDemo',
});

const props = defineProps<{
  values?: any;
}>();

const emit = defineEmits(['tableReload', 'close', 'busyChange']);
const saving = ref(false);
const deleting = ref(false);
const dictLoading = ref(false);
const busy = computed(() => saving.value || deleting.value);

watch(busy, (value) => emit('busyChange', value), { flush: 'sync' });

const tableReload = () => {
  emit('tableReload');
};

const handleClose = () => {
  emit('close');
};

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

async function loadDictOptions() {
  dictLoading.value = true;
  try {
    const res = await getByDictType('performance_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载字典选项失败:', error);
  } finally {
    dictLoading.value = false;
  }
}

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  wrapperClass: 'performance-fields',
  commonConfig: {
    formItemClass: 'pb-0 min-w-0',
    labelClass: 'text-xs font-medium text-muted-foreground mb-2',
    componentProps: { size: 'large' },
  },
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '活动名称' },
      fieldName: 'performanceName',
      formItemClass: 'performance-name',
      label: '活动名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: () => ({
        placeholder: '选择活动类型',
        options: dictOptions.value,
        loading: dictLoading.value,
        showSearch: true,
        optionFilterProp: 'label',
        style: { width: '100%' },
      }),
      fieldName: 'performanceType',
      label: '活动类型',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '参与人' },
      fieldName: 'performer',
      label: '参与人',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: {
        placeholder: '选择日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
      fieldName: 'performanceDate',
      label: '活动日期',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '0.00',
        prefix: '¥',
        inputmode: 'decimal',
      },
      fieldName: 'ticketPrice',
      label: '票价',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '所在城市' },
      fieldName: 'city',
      label: '城市',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '场馆或详细地点' },
      fieldName: 'venue',
      label: '地点',
      rules: 'required',
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
  handleSubmit: () => handleSubmit(),
});

const fileId = ref<null | string>(null);

const syncFileId = (values: any) => {
  const files = values?.files || [];
  fileId.value = files.length > 0 ? String(files[0].id) : null;
};

watch(
  () => props.values,
  (newValues) => {
    if (newValues) {
      formApi.setValues(newValues);
    }
    syncFileId(newValues);
  },
  { immediate: true },
);

onMounted(async () => {
  await loadDictOptions();
  if (props.values) {
    formApi.setValues(props.values);
    syncFileId(props.values);
  }
});

const handleSubmit = async () => {
  if (busy.value) return;
  saving.value = true;
  try {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const formData = await formApi.getValues();
    const payload = {
      ...toRaw(formData),
      fileIds: fileId.value ? [fileId.value] : [],
    };
    if (props.values?.id) {
      await updatePerformance({ ...payload, id: props.values.id });
    } else {
      await createPerformance(payload);
    }
    tableReload();
    saving.value = false;
    handleClose();
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  formApi.resetForm();
  handleClose();
};

const handleDelete = async () => {
  if (!props.values?.id || busy.value) return;
  deleting.value = true;
  try {
    await deletePerformance(props.values.id);
    message.success('删除成功');
    deleting.value = false;
    tableReload();
    handleClose();
  } catch (error) {
    console.error('删除失败:', error);
  } finally {
    deleting.value = false;
  }
};
</script>
<template>
  <div class="performance-editor">
    <div class="performance-editor-body" :aria-busy="busy">
      <Form />
      <div class="performance-cover">
        <div class="performance-cover-label">封面图片</div>
        <ImageUpload
          v-model:file-id="fileId"
          :upload-fn="uploadPerformanceAttachment"
          hint=""
        />
      </div>
    </div>
    <div class="performance-editor-footer">
      <Popconfirm
        v-if="props.values?.id"
        title="确定删除这条活动记录吗？"
        ok-text="删除"
        cancel-text="取消"
        placement="topLeft"
        :disabled="busy"
        @confirm="handleDelete"
      >
        <Button
          class="performance-delete"
          type="text"
          danger
          aria-label="删除活动"
          :loading="deleting"
          :disabled="saving"
        >
          <template #icon><DeleteOutlined /></template>
        </Button>
      </Popconfirm>
      <div class="performance-editor-actions">
        <Button :disabled="busy" @click="handleCancel">取消</Button>
        <Button
          type="primary"
          :loading="saving"
          :disabled="deleting"
          @click="handleSubmit"
        >
          保存
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-editor-body {
  max-height: calc(100dvh - 100px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 28px 28px 24px;
}

:deep(.performance-fields) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

:deep(.performance-name) {
  grid-column: 1 / -1;
}

:deep(.ant-input),
:deep(.ant-input-affix-wrapper),
:deep(.ant-picker),
:deep(.ant-select .ant-select-selector) {
  border-color: hsl(var(--border) / 0.8);
  border-radius: 10px;
  background: hsl(var(--background) / 0.5);
  font-size: 14px;
}

:deep(.ant-input-affix-wrapper > .ant-input) {
  border-radius: 0;
  background: transparent;
}

:deep(.ant-input-prefix) {
  margin-right: 8px;
  color: hsl(var(--muted-foreground));
}

:deep(.ant-picker-input > input) {
  font-size: 14px;
}

:deep(.ant-input:hover),
:deep(.ant-input-affix-wrapper:hover),
:deep(.ant-picker:hover),
:deep(.ant-select:hover .ant-select-selector) {
  border-color: hsl(var(--primary) / 0.5);
}

:deep(.ant-input:focus),
:deep(.ant-input-affix-wrapper-focused),
:deep(.ant-picker-focused),
:deep(.ant-select-focused .ant-select-selector) {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

:deep(.ant-input[aria-invalid='true']) {
  border-color: hsl(var(--destructive));
}

:deep(.ant-input[aria-invalid='true']:focus) {
  box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.1);
}

.performance-cover {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 22px;
}

.performance-cover-label {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  font-weight: 500;
}

.performance-cover :deep(.ant-upload-list) {
  line-height: 0;
}

.performance-cover :deep(.ant-upload-select),
.performance-cover :deep(.ant-upload-list-item-container) {
  width: 96px !important;
  height: 68px !important;
  margin: 0 !important;
  border-radius: 10px !important;
}

.performance-cover :deep(.ant-upload-list-item) {
  padding: 4px;
  border-radius: 10px;
}

.performance-cover :deep(.ant-upload-list-item-thumbnail img) {
  object-fit: cover;
  border-radius: 6px;
}

.performance-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 28px;
  background: hsl(var(--muted) / 0.4);
}

.performance-editor-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.performance-editor-footer :deep(.ant-btn) {
  height: 38px;
  border-radius: 10px;
}

.performance-editor-actions :deep(.ant-btn) {
  min-width: 80px;
}

.performance-editor-actions :deep(.ant-btn-primary) {
  box-shadow: 0 3px 8px hsl(var(--primary) / 0.18);
}

.performance-delete {
  width: 38px;
}

@media (max-width: 479px) {
  .performance-editor-body {
    max-height: calc(100dvh - 96px);
    padding: 24px 20px 20px;
  }

  :deep(.performance-fields) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .performance-editor-footer {
    padding: 16px 20px;
  }
}
</style>
