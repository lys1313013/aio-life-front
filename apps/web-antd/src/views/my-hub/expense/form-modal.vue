<script lang="ts" setup>
import { nextTick, onMounted, ref, toRaw } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { insertData, updateData } from '#/api/core/expense';
import { getByDictType } from '#/api/core/userDictType';

defineOptions({
  name: 'FormModalDemo',
});

const emit = defineEmits(['tableReload', 'updateSuccess']);

// 连续录入模式开关
const continuousMode = ref(false);

const tableReload = () => {
  emit('tableReload');
};

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
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '实际记账的钱',
      },
      fieldName: 'amt',
      label: '记账金额',
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

// 重置表单数据
const resetForm = () => {
  formApi.setValues({
    amt: '',
  });
};

const [Modal, modalApi] = useVbenModal({
  onCancel() {
    modalApi.close();
  },
  onConfirm: async () => {
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
      await updateData(processedData);
    } else {
      await insertData(processedData);
    }

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
  },
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      // 使用 nextTick 确保 DOM 已经渲染完成
      nextTick(() => {
        formApi.resetForm();
        const { values } = modalApi.getData<Record<string, any>>();
        if (values) {
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
              processedValues.expTime = processedValues.expTime.replace(
                'T',
                ' ',
              );
            }
          } else {
            // 新增时，如果没有日期值，设置默认时间为当前日期的00:00:00
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            processedValues.expTime = `${today} 00:00:00`;
          }
          formApi.setValues(processedValues);
        }
      });
    } else {
      // 弹窗关闭时重置连续录入模式
      continuousMode.value = false;
    }
  },
  title: '',
  bordered: false,
  headerClass: 'border-none',
  footerClass: 'border-none',
  contentClass: 'p-6',
});
</script>
<template>
  <Modal>
    <Form />

    <template #prepend-footer>
      <!-- 连续录入模式开关 -->
      <div class="mr-auto flex items-center gap-2">
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
