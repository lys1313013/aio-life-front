<script lang="ts" setup>
import { toRaw, ref, onMounted } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { query } from '#/api/core/sysDictType';
import { insertOrUpdate } from '#/api/core/sysDictData';

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
    const res = await query({});
    dictOptions.value = res.items.map((item: { dictName: string; dictId: string }) => ({
      label: item.dictName,
      value: item.dictId
    }));
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
      fieldName: 'dictCode',
      label: 'dictCode',
      disabled: true
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: dictOptions,
        style: { width: '100%' }  // 设置为100%宽度
      },
      fieldName: 'dictId',
      label: '字典类型',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'dictValue',
      label: '实际值',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'dictLabel',
      label: '展示值',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
      },
      fieldName: 'dictSort',
      label: '排序',
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
