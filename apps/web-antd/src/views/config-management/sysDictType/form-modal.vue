<script lang="ts" setup>
import { toRaw } from 'vue';

import { useAppForm } from '#/adapter/form';
import { useVbenModal } from '#/adapter/modal';
import { add, update } from '#/api/core/sysDictType';

defineOptions({
  name: 'FormModal',
});

const emit = defineEmits(['tableReload']);
const tableReload = () => {
  emit('tableReload');
};

const [Form, formApi] = useAppForm({
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '【自动生成】',
      },
      fieldName: 'dictId',
      label: '主键',
      disabled: true,
      dependencies: {
        triggerFields: ['id'],
        show: false,
      },
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'dictName',
      label: '字典名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'dictType',
      label: '字典标识',
      rules: 'required',
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
});
const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    modalApi.lock();
    try {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const newVar = toRaw(await formApi.submitForm());
      if (newVar.dictId) {
        await update(newVar.dictId, newVar);
      } else {
        await add(newVar);
      }
      modalApi.close();
      tableReload();
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const { values } = modalApi.getData<Record<string, any>>();
      if (values) {
        formApi.setValues(values);
      }
    }
  },
  title: '字典类型',
  class: 'sm:max-w-[500px]',
});
</script>
<template>
  <Modal>
    <Form />
  </Modal>
</template>
