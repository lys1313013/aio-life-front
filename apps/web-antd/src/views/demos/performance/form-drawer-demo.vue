<script lang="ts" setup>
import { toRaw, ref, onMounted } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { insertOrUpdate } from '#/api/core/performance';

import { getByDictType } from '#/api/core/common';

defineOptions({
  name: 'FormDrawerDemo',
});

const emit = defineEmits(['tableReload']);
const tableReload = () => {
  emit('tableReload');
};

const dictOptions = ref<Array<{label: string, value: string}>>([]);

async function loadDictOptions() {
  try {
    const res = await getByDictType('performance_type');
    dictOptions.value = res.dictDetailList
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
      fieldName: 'id',
      label: '主键',
      disabled: true,
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'performanceName',
      label: '演出名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'performer',
      label: '演员名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: dictOptions,
        style: { width: '100%' },
      },
      fieldName: 'performanceType',
      label: '演出类型',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'city',
      label: '演出城市',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'venue',
      label: '演出地点',
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
        placeholder: '请选择演出日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
      },
      fieldName: 'performanceDate',
      label: '演出日期',
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
const [Drawer, drawerApi] = useVbenDrawer({
  onCancel() {
    drawerApi.close();
  },
  onConfirm: async () => {
    const newVar = await formApi.submitForm();
    await insertOrUpdate(toRaw(newVar));
    drawerApi.close();
    tableReload();
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
