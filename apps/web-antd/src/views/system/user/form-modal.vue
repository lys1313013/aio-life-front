<script lang="ts" setup>
import { ref } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { useVbenForm } from '#/adapter/form';
import { addUserApi, updateUserApi } from '#/api/system/user';
import { message } from 'ant-design-vue';

const emit = defineEmits(['reload']);

const isUpdate = ref(false);

const [Form, formApi] = useVbenForm({
  commonConfig: {
    labelWidth: 80,
  },
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      label: 'ID',
      dependencies: {
        triggerFields: ['id'],
        show: false,
      },
    },
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
      componentProps: {
        placeholder: '请输入用户名',
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'password',
      label: '密码',
      componentProps: {
        placeholder: '留空则不修改(新增默认123456)',
      },
    },
    {
      component: 'Input',
      fieldName: 'nickname',
      label: '昵称',
      rules: 'required',
      componentProps: {
        placeholder: '请输入昵称',
      },
    },
    {
      component: 'Select',
      fieldName: 'role',
      label: '角色',
      rules: 'required',
      componentProps: {
        options: [
          { label: '管理员', value: 'admin' },
          { label: '普通用户', value: 'user' },
        ],
        placeholder: '请选择角色',
      },
      defaultValue: 'user',
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
      componentProps: {
        placeholder: '请输入邮箱',
      },
    },
  ],
  showDefaultActions: false,
});

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
    await formApi.validate();
    const values = await formApi.getValues();
    try {
      if (isUpdate.value) {
        await updateUserApi(values);
        message.success('修改成功');
      } else {
        await addUserApi(values);
        message.success('新增成功');
      }
      modalApi.close();
      emit('reload');
    } catch (error) {
      console.error(error);
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      const data = modalApi.getData<Record<string, any>>();
      isUpdate.value = !!data?.values?.id;
      if (data?.values) {
        formApi.setValues(data.values);
      } else {
        formApi.resetForm();
      }
    }
  },
  title: isUpdate.value ? '编辑用户' : '新增用户',
  class: 'w-[600px]',
});
</script>
<template>
  <Modal title="用户管理">
    <Form />
  </Modal>
</template>
