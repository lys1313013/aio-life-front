<script lang="ts" setup>
import { onMounted, ref, toRaw, watch } from 'vue';

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

const emit = defineEmits(['tableReload', 'close']);

const tableReload = () => {
  emit('tableReload');
};

const handleClose = () => {
  emit('close');
};

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

async function loadDictOptions() {
  try {
    const res = await getByDictType('performance_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
}

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'performanceName',
      label: '活动名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'performer',
      label: '参与人',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: dictOptions,
        showSearch: true,
        optionFilterProp: 'label',
        style: { width: '100%' },
      },
      fieldName: 'performanceType',
      label: '活动类型',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'city',
      label: '城市',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'venue',
      label: '地点',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'ticketPrice',
      label: '票价',
    },
    {
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择活动日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'performanceDate',
      label: '活动日期',
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
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
  try {
    const formData = await formApi.submitForm();
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
    handleClose();
  } catch (error) {
    console.error('保存失败:', error);
  }
};

const handleCancel = () => {
  formApi.resetForm();
  handleClose();
};

const handleDelete = async () => {
  if (!props.values?.id) return;
  try {
    await deletePerformance(props.values.id);
    message.success('删除成功');
    tableReload();
    handleClose();
  } catch (error) {
    console.error('删除失败:', error);
  }
};
</script>
<template>
  <div class="p-4">
    <Form />
    <div class="mt-2">
      <div class="mb-1 text-sm">封面图片</div>
      <ImageUpload
        v-model:file-id="fileId"
        :upload-fn="uploadPerformanceAttachment"
      />
    </div>
    <div class="mt-4 flex justify-between gap-2 border-t border-border pt-4">
      <div>
        <Popconfirm
          v-if="props.values?.id"
          title="确定要删除吗？"
          ok-text="删除"
          cancel-text="取消"
          placement="topLeft"
          @confirm="handleDelete"
        >
          <Button danger>删除</Button>
        </Popconfirm>
      </div>
      <div class="flex gap-2">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" @click="handleSubmit">保存</Button>
      </div>
    </div>
  </div>
</template>
