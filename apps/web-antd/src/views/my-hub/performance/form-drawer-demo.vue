<script lang="ts" setup>
import { computed, onMounted, ref, toRaw, watch } from 'vue';

import { message } from 'ant-design-vue';

import { useAppForm } from '#/adapter/form';
import { getByDictType } from '#/api/core/common';
import {
  createPerformance,
  deletePerformance,
  updatePerformance,
  uploadPerformanceAttachment,
} from '#/api/core/performance';
import { AppModalDelete, AppModalFooter } from '#/components/app-modal';
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

const [Form, formApi] = useAppForm({
  layout: 'vertical',
  columns: 2,
  schema: [
    {
      component: 'Input',
      componentProps: { placeholder: '活动名称' },
      fieldName: 'performanceName',
      formItemClass: 'app-form-full',
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
    <div :aria-busy="busy">
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
    <AppModalFooter
      :busy="deleting"
      :confirm-loading="saving"
      @cancel="handleCancel"
      @confirm="handleSubmit"
    >
      <template #leading>
        <AppModalDelete
          v-if="props.values?.id"
          :loading="deleting"
          :disabled="saving"
          title="确定删除这条活动记录吗？"
          :action="handleDelete"
        />
      </template>
    </AppModalFooter>
  </div>
</template>

<style scoped>
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
</style>
