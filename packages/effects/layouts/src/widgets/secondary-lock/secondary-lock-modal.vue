<script setup lang="ts">
import type { Recordable } from '@vben/types';

import { computed, reactive } from 'vue';

import { $t } from '@vben/locales';

import { useVbenForm, z } from '@vben-core/form-ui';
import { useVbenModal } from '@vben-core/popup-ui';
import { VbenButton } from '@vben-core/shadcn-ui';

defineOptions({ name: 'SecondaryLockModal' });

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const [Form, { resetForm, validate, getValues, getFieldComponentRef }] =
  useVbenForm(
    reactive({
      commonConfig: { hideLabel: true, hideRequiredMark: true },
      schema: computed(() => [
        {
          component: 'VbenInputPassword' as const,
          componentProps: { placeholder: '请输入二级密码' },
          fieldName: 'password',
          formFieldProps: { validateOnBlur: false },
          label: '二级密码',
          rules: z.string().min(1, { message: '请输入二级密码' }),
        },
      ]),
      showDefaultActions: false,
    }),
  );

const [Modal] = useVbenModal({
  onConfirm() {
    handleSubmit();
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      resetForm();
    }
  },
  onOpened() {
    requestAnimationFrame(() => {
      getFieldComponentRef('password')
        ?.$el?.querySelector('[name="password"]')
        ?.focus();
    });
  },
});

async function handleSubmit() {
  const { valid } = await validate();
  const values = await getValues();
  if (valid) {
    emit('submit', values?.password);
  }
}
</script>

<template>
  <Modal
    :closable="false"
    :close-on-click-modal="false"
    :footer="false"
    :fullscreen-button="false"
    :title="'二级密码验证'"
  >
    <div
      class="mb-4 flex w-full flex-col items-center px-6"
      @keydown.enter.prevent="handleSubmit"
    >
      <div class="text-muted-foreground mb-6 text-center text-sm">
        当前菜单需要二级密码验证
      </div>
      <div class="w-full">
        <Form />
        <VbenButton class="mt-3 w-full" @click="handleSubmit">
          确认解锁
        </VbenButton>
      </div>
    </div>
  </Modal>
</template>
