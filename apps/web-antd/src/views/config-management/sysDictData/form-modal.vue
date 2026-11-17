<script lang="ts" setup>
import type { ApiRequests } from '#/api/payload';

import { onMounted, ref, toRaw } from 'vue';

import { useAppForm } from '#/adapter/form';
import { useVbenModal } from '#/adapter/modal';
import { add, update } from '#/api/core/sysDictData';
import { query } from '#/api/core/sysDictType';

defineOptions({
  name: 'FormModal',
});

const emit = defineEmits(['tableReload']);
const tableReload = () => {
  emit('tableReload');
};

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

async function loadDictOptions() {
  try {
    const res = await query({});
    dictOptions.value = res.items.map(
      (item: { id: string; dictName: string }) => ({
        label: item.dictName,
        value: item.id,
      }),
    );
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
}

onMounted(() => {
  loadDictOptions();
});

const [Form, formApi] = useAppForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      label: 'id',
      disabled: true,
      dependencies: {
        triggerFields: ['id'],
        show: false,
      },
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: dictOptions,
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        style: { width: '100%' }, // 设置为100%宽度
      },
      fieldName: 'dictTypeId',
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
      fieldName: 'sortOrder',
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
      const newVar: Record<string, any> = toRaw(await formApi.submitForm());
      if (newVar.id) {
        await update(
          newVar.id,
          newVar as ApiRequests['SysDictDataUpdateReq'],
        );
      } else {
        await add(newVar as ApiRequests['SysDictDataCreateReq']);
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
  title: '字典数据',
  class: 'sm:max-w-[500px]',
});
</script>
<template>
  <Modal>
    <Form />
  </Modal>
</template>
