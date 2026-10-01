<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '@vben-core/form-ui';

import { computed, reactive, ref } from 'vue';

import { useVbenForm } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';
import { handleEnterSubmit } from '@vben-core/shared/utils';

interface Props {
  formSchema?: VbenFormSchema[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  formSchema: () => [],
  loading: false,
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const [Form, formApi] = useVbenForm(
  reactive({
    commonConfig: {
      // 所有表单项
      componentProps: {
        class: 'w-full',
      },
    },
    layout: 'vertical',
    schema: computed(() => props.formSchema),
    showDefaultActions: false,
  }),
);

const validating = ref(false);
async function handleSubmit() {
  if (props.loading || validating.value) return;
  validating.value = true;
  try {
    const { valid } = await formApi.validate();
    const values = await formApi.getValues();
    if (valid) emit('submit', values);
  } finally {
    validating.value = false;
  }
}

defineExpose({
  getFormApi: () => formApi,
});
</script>
<template>
  <div
    data-enter-submit-scope
    @keydown.capture="
      (event) => handleEnterSubmit(event, handleSubmit, loading || validating)
    "
  >
    <Form />
    <div class="mt-4 flex justify-end">
      <VbenButton
        :loading="loading || validating"
        type="button"
        @click="handleSubmit"
      >
        更新密码
      </VbenButton>
    </div>
  </div>
</template>
