<script lang="ts" setup>
import { nextTick, onMounted, ref, toRaw } from 'vue';

import { message, Radio } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useAppForm } from '#/adapter/form';
import { useVbenModal } from '#/adapter/modal';
import { deleteData, insertData, updateData } from '#/api/core/expense';
import { getByDictType } from '#/api/core/userDictType';
import { AppModalDelete } from '#/components/app-modal';

defineOptions({
  name: 'FormModalDemo',
});

defineProps<{ showKindSwitch?: boolean }>();
const emit = defineEmits([
  'tableReload',
  'updateSuccess',
  'saved',
  'kindChange',
  'deleted',
]);

// 连续录入模式开关
const continuousMode = ref(false);

// 上一次交易金额，用于判断记账金额是否为级联填充值
const prevTransactionAmt = ref<null | string | undefined>();

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
    const result = await deleteData({ id });
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
const payTypeOptions = ref<Array<any>>([]);

async function loadDictOptions() {
  try {
    const res = await getByDictType('exp_type');
    dictOptions.value = res.dictDetailList.map((item) => ({
      ...item,
      label: item.dictLabel || item.label,
      value: item.dictValue || item.value,
    }));

    const res2 = await getByDictType('pay_type');
    payTypeOptions.value = res2.dictDetailList.map((item) => ({
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
        show: () => false,
      },
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '交易金额',
      },
      fieldName: 'transactionAmt',
      label: '交易金额',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '实际记账的钱',
      },
      fieldName: 'amt',
      label: '记账金额',
      rules: 'required',
      dependencies: {
        triggerFields: ['transactionAmt'],
        trigger(value, actions) {
          // 记账金额为空（或仍等于上一次交易金额的级联值）时，跟随交易金额变化
          if (
            value.amt === '' ||
            value.amt === null ||
            value.amt === undefined ||
            String(value.amt) === String(prevTransactionAmt.value ?? '')
          ) {
            actions.setFieldValue('amt', value.transactionAmt);
          }
          prevTransactionAmt.value = value.transactionAmt;
        },
      },
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
      fieldName: 'expTypeId',
      label: '支出类型',
      rules: 'selectRequired',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择',
        options: payTypeOptions,
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        style: { width: '100%' },
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'payTypeId',
      label: '支付方式',
      rules: 'selectRequired',
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

// 重置表单数据
const resetForm = () => {
  formApi.setValues({
    amt: '',
    transactionAmt: '',
  });
  prevTransactionAmt.value = '';
};

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
      const formData = await formApi.submitForm();
      const processedData = { ...toRaw(formData) };

      // 处理日期字段，确保格式正确
      if (
        processedData.expTime && // 如果只有日期部分，添加时间部分
        typeof processedData.expTime === 'string' &&
        !processedData.expTime.includes(' ')
      ) {
        processedData.expTime = `${processedData.expTime} 00:00:00`;
      }

      if (processedData.id) {
        await updateData({
          ...originalValues.value,
          ...processedData,
          id: processedData.id,
        });
      } else {
        await insertData(processedData);
      }

      emit('saved');

      // 根据连续录入模式决定是否关闭弹窗
      if (continuousMode.value) {
        // 连续录入模式：重置表单，保持弹窗打开
        resetForm();
        tableReload();
      } else {
        // 普通模式：关闭弹窗
        modalApi.close();
        if (processedData.id) {
          emit('updateSuccess', processedData);
        } else {
          tableReload();
        }
      }
    } finally {
      saving.value = false;
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      // 使用 nextTick 确保 DOM 已经渲染完成
      nextTick(() => {
        formApi.resetForm();
        const { values = {} } = modalApi.getData<Record<string, any>>() ?? {};
        originalValues.value = { ...values };
        // 处理日期字段显示
        const processedValues = { ...values };
        if (processedValues.expTime) {
          // 确保日期格式正确，直接使用后端返回的日期时间格式
          // DatePicker 会自动根据 format 和 valueFormat 进行显示
          if (
            typeof processedValues.expTime === 'string' &&
            processedValues.expTime.includes('T')
          ) {
            // 如果是 ISO 格式，转换为本地格式
            processedValues.expTime = processedValues.expTime.replace('T', ' ');
          }
        } else {
          // 新增时，如果没有日期值，设置默认时间为当前日期的00:00:00
          processedValues.expTime = dayjs()
            .startOf('day')
            .format('YYYY-MM-DD HH:mm:ss');
        }
        formApi.setValues(processedValues);
        prevTransactionAmt.value = processedValues.transactionAmt;
      });
    } else {
      // 弹窗关闭时重置连续录入模式
      continuousMode.value = false;
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
      value="expense"
      class="mb-5"
      :disabled="saving"
      aria-label="收支类型"
      @change="emit('kindChange', 'income')"
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
      <!-- 连续录入模式开关 -->
      <div v-else class="mr-auto flex items-center gap-2">
        <span class="text-sm text-gray-600">连续录入:</span>
        <div
          class="relative inline-block h-6 w-10 cursor-pointer"
          @click="continuousMode = !continuousMode"
        >
          <div
            class="absolute bottom-0 left-0 right-0 top-0 rounded-full transition-colors duration-300"
            :class="continuousMode ? 'bg-blue-500' : 'bg-gray-300'"
          ></div>
          <div
            class="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform duration-300"
            :class="continuousMode ? 'translate-x-5' : 'translate-x-1'"
          ></div>
        </div>
      </div>
    </template>
  </Modal>
</template>
