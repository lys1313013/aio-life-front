<script lang="ts" setup>
import { onMounted, ref, toRaw, watch } from 'vue';

import { Button } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getByDictType } from '#/api/core/common';
import { insertOrUpdate } from '#/api/core/performance';

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
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'imageUrl',
      label: '封面地址',
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
});

watch(
  () => props.values,
  (newValues) => {
    if (newValues) {
      formApi.setValues(newValues);
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await loadDictOptions();
  if (props.values) {
    formApi.setValues(props.values);
  }
});

const handleSubmit = async () => {
  try {
    const formData = await formApi.submitForm();
    await insertOrUpdate(toRaw(formData));
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
</script>
<template>
  <div class="p-4">
    <Form />
    <div class="mt-4 flex justify-end gap-2 border-t border-border pt-4">
      <Button @click="handleCancel">取消</Button>
      <Button type="primary" @click="handleSubmit">保存</Button>
    </div>
  </div>
</template>
