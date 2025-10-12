<script lang="ts" setup>
import { onMounted, ref, toRaw } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { getByDictType } from '#/api/core/common';
import { insertOrUpdate } from '#/api/core/expense';

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
    const res = await getByDictType('exp_type');
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
      fieldName: 'id',
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
        style: { width: '100%' },
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'expTypeId',
      label: '支出类型',
    },
    {
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择日期',
        format: 'YYYY-MM-DD HH:mm:ss',
        valueFormat: 'YYYY-MM-DD HH:mm:ss',
        showTime: { format: 'HH:mm:ss' },
      },
      fieldName: 'expTime',
      label: '支出日期',
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
    const formData = await formApi.submitForm();
    const processedData = { ...toRaw(formData) };
    
    // 处理日期字段，确保格式正确
    if (processedData.expTime) {
      // 如果只有日期部分，添加时间部分
      if (typeof processedData.expTime === 'string' && !processedData.expTime.includes(' ')) {
        processedData.expTime = `${processedData.expTime} 00:00:00`;
      }
    }
    
    await insertOrUpdate(processedData);
    drawerApi.close();
    tableReload();
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const { values } = drawerApi.getData<Record<string, any>>();
      if (values) {
        // 处理日期字段显示
        const processedValues = { ...values };
        if (processedValues.expTime) {
          // 确保日期格式正确，直接使用后端返回的日期时间格式
          // DatePicker 会自动根据 format 和 valueFormat 进行显示
          if (typeof processedValues.expTime === 'string' && processedValues.expTime.includes('T')) {
            // 如果是 ISO 格式，转换为本地格式
            processedValues.expTime = processedValues.expTime.replace('T', ' ');
          }
        } else {
          // 新增时，如果没有日期值，设置默认时间为当前日期的00:00:00
          const now = new Date();
          const today = now.toISOString().split('T')[0];
          processedValues.expTime = `${today} 00:00:00`;
        }
        formApi.setValues(processedValues);
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
