<script lang="ts" setup>
import { onMounted, ref, toRaw } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { getByDictType } from '#/api/core/common';
import { insertOrUpdate } from '#/api/core/income';

defineOptions({
  name: 'FormDrawerDemo',
});

const emit = defineEmits(['tableReload']);
const tableReload = () => {
  emit('tableReload');
};

const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

async function loadDictOptions() {
  try {
    const res = await getByDictType('income_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
}

onMounted(() => {
  loadDictOptions();
});

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '【自动生成】',
      },
      fieldName: 'incomeId',
      label: '主键',
      disabled: true,
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'amt',
      label: '金额',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: dictOptions,
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        style: { width: '100%' },
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'incTypeId',
      label: '收入类型',
    },
    {
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'incDate',
      label: '收入日期',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'remark',
      label: '备注',
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
});
const [Drawer, drawerApi] = useVbenDrawer({
  onCancel() {
    drawerApi.close();
  },
  onConfirm: async () => {
      drawerApi.lock();
      try {
        const newVar = await formApi.submitForm();
        await insertOrUpdate(toRaw(newVar));
        drawerApi.close();
        tableReload();
      } finally {
        drawerApi.unlock();
      }
    },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const { values } = drawerApi.getData<Record<string, any>>();
      if (values) {
        formApi.setValues(values);
      }
    }
  },
  title: '',
});
</script>
<template>
  <Drawer>
    <Form />
  </Drawer>
</template>
