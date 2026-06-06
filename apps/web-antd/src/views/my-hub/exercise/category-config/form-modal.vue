<script lang="ts" setup>
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { insertOrUpdate } from '#/api/core/userDictData';
import { message } from 'ant-design-vue';

defineOptions({
  name: 'CategoryConfigFormModal',
});

const emit = defineEmits(['updateSuccess']);

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      label: '主键',
      dependencies: {
        triggerFields: ['id'],
        show: () => false,
      },
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入名称',
      },
      fieldName: 'dictLabel',
      label: '名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入标识',
      },
      fieldName: 'dictValue',
      label: '标识',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入图标 (例如: mdi:run)',
      },
      fieldName: 'icon',
      label: '图标',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入颜色 (例如: #1677ff 或 blue)',
      },
      fieldName: 'color',
      label: '颜色',
    },
    {
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入排序',
        style: { width: '100%' },
      },
      fieldName: 'dictSort',
      label: '排序',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '正常', value: 1 },
          { label: '停用', value: 0 },
        ],
      },
      fieldName: 'status',
      label: '状态',
      defaultValue: 1,
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
});

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    const formData = await formApi.submitForm();
    
    // 强制加入 dictType
    const payload = {
      ...formData,
      dictType: 'exercise_type',
    };
    
    await insertOrUpdate(payload);
    message.success('保存成功');
    modalApi.close();
    emit('updateSuccess');
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      formApi.resetForm();
      const { values } = modalApi.getData<Record<string, any>>();
      if (values) {
        formApi.setValues(values);
      }
    }
  },
  title: '分类配置',
});
</script>

<template>
  <Modal>
    <Form />
  </Modal>
</template>
