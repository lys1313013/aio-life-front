<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';

import { Button } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { add, update } from '#/api/core/exerciseRecord';
import { getByDictType } from '#/api/core/common';

const props = defineProps<{
  values: any;
}>();

const emit = defineEmits(['table-reload', 'close']);

const exerciseTypeOptions = ref<Array<{ label: string; value: string }>>([]);

// 加载运动类型数据
const loadExerciseTypes = async () => {
  try {
    const res = await getByDictType('exercise_type');
    exerciseTypeOptions.value = res.dictDetailList.map((item: any) => ({
      label: item.label,
      value: item.value,
    }));
  } catch (error) {
    console.error('加载运动类型失败:', error);
  }
};

// 监听 values 变化
onMounted(() => {
  loadExerciseTypes();
});

const [Form, formApi] = useVbenForm({
  schema: [
    {
      component: 'Input',
      fieldName: 'id',
      label: '主键',
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
        options: exerciseTypeOptions,
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        style: { width: '100%' },
        fieldNames: { label: 'label', value: 'value' },
      },
      fieldName: 'exerciseTypeId',
      label: '运动类型',
      rules: 'selectRequired',
    },
    {
      component: 'DatePicker',
      componentProps: {
        placeholder: '请选择日期',
        format: 'YYYY-MM-DD',
        valueFormat: 'YYYY-MM-DD',
        style: { width: '100%' },
      },
      fieldName: 'exerciseDate',
      label: '运动日期',
      rules: 'required',
      defaultValue: dayjs().format('YYYY-MM-DD'),
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        type: 'number',
        style: { width: '100%' },
      },
      fieldName: 'exerciseCount',
      label: '运动数量',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入',
        rows: 4,
        maxLength: 200,
        showCount: true,
      },
      fieldName: 'description',
      label: '备注',
    },
  ],
  showDefaultActions: false,
  submitOnEnter: true,
});

// 监听 props.values 变化，实时更新表单数据
watch(
  () => props.values,
  (newValues) => {
    if (newValues) {
      const values = { ...newValues };
      // 如果没有日期，默认为当天
      if (!values.exerciseDate) {
        values.exerciseDate = dayjs().format('YYYY-MM-DD');
      }
      formApi.setValues(values);
    }
  },
  { deep: true, immediate: true },
);

// 提交表单
const handleSubmit = async () => {
  try {
    const formData = await formApi.submitForm();
    let res;
    if (props.values && props.values.id) {
      // 编辑模式
      res = await update(formData);
    } else {
      // 新增模式
      res = await add(formData);
    }
    if (res) {
      emit('table-reload');
      emit('close');
    }
  } catch (error) {
    console.error('提交表单失败:', error);
  }
};
</script>

<template>
  <div class="p-4">
    <Form />

    <div class="flex justify-end mt-6">
      <Button class="mr-2" @click="$emit('close')">
        取消
      </Button>
      <Button type="primary" @click="handleSubmit">
        确定
      </Button>
    </div>
  </div>
</template>

<style scoped>
.p-4 {
  padding: 16px;
}

.mt-6 {
  margin-top: 24px;
}

.flex {
  display: flex;
}

.justify-end {
  justify-content: flex-end;
}

.mr-2 {
  margin-right: 8px;
}
</style>
