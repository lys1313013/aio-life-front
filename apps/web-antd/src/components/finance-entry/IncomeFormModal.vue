<script lang="ts" setup>
import { onMounted, ref, toRaw } from 'vue';

import { message, Radio } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useAppForm } from '#/adapter/form';
import { useVbenModal } from '#/adapter/modal';
import { add, deleteData, update } from '#/api/core/income';
import { getByDictType } from '#/api/core/userDictType';
import { AppModalDelete } from '#/components/app-modal';

defineOptions({
  name: 'FormModal',
});

defineProps<{ showKindSwitch?: boolean }>();
const emit = defineEmits(['tableReload', 'saved', 'kindChange', 'deleted']);
const tableReload = () => {
  emit('tableReload');
};

const saving = ref(false);
const deleting = ref(false);
const originalValues = ref<Record<string, any>>({});
async function remove() {
  const id = originalValues.value.id;
  if (!id || saving.value || deleting.value) return;
  deleting.value = true;
  try {
    const result = await deleteData(id);
    if (result === false) {
      message.error('记录未删除，请重试');
      return;
    }
    modalApi.close();
    emit('deleted', id);
    tableReload();
  } catch {
    // API 错误由请求客户端提示，保留表单供重试。
  } finally {
    deleting.value = false;
  }
}
const dictOptions = ref<Array<any>>([]);

async function loadDictOptions() {
  try {
    const res = await getByDictType('income_type');
    dictOptions.value = res.dictDetailList.map((item) => ({
      ...item,
      label: item.dictLabel || item.label,
      value: item.dictValue || item.value,
    }));
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
      componentProps: {
        placeholder: '【自动生成】',
      },
      fieldName: 'id',
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
    if (!deleting.value) modalApi.close();
  },
  onConfirm: async () => {
    if (saving.value || deleting.value) return;
    saving.value = true;
    modalApi.lock();
    try {
      const { valid } = await formApi.validate();
      if (!valid) return;
      const newVar = toRaw(await formApi.submitForm());
      if (newVar.id) {
        await update(newVar.id, { ...originalValues.value, ...newVar });
      } else {
        await add(newVar);
      }
      modalApi.close();
      tableReload();
      emit('saved');
    } finally {
      saving.value = false;
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      formApi.resetForm();
      const { values = {} } = modalApi.getData<Record<string, any>>() ?? {};
      originalValues.value = { ...values };
      formApi.setValues({ incDate: dayjs().format('YYYY-MM-DD'), ...values });
    }
  },
  title: '',
});
</script>
<template>
  <Modal
    :confirm-disabled="deleting"
    :close-on-click-modal="!deleting"
    :close-on-press-escape="!deleting"
  >
    <Radio.Group
      v-if="showKindSwitch"
      value="income"
      class="mb-5"
      :disabled="saving"
      aria-label="收支类型"
      @change="emit('kindChange', 'expense')"
    >
      <Radio.Button value="expense">支出</Radio.Button>
      <Radio.Button value="income">收入</Radio.Button>
    </Radio.Group>
    <Form />
    <template #prepend-footer>
      <AppModalDelete
        v-if="originalValues.id"
        class="mr-auto"
        title="确认删除？"
        :action="remove"
        :disabled="saving"
        :loading="deleting"
      />
    </template>
  </Modal>
</template>
