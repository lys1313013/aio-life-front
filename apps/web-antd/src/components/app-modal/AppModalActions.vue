<script setup lang="ts">
import type { ButtonProps } from 'ant-design-vue';

import { Button } from 'ant-design-vue';

withDefaults(
  defineProps<{
    busy?: boolean;
    cancelButtonProps?: ButtonProps;
    cancelText?: string;
    confirmDisabled?: boolean;
    confirmLoading?: boolean;
    confirmText?: string;
    okButtonProps?: ButtonProps;
    showConfirm?: boolean;
  }>(),
  {
    busy: false,
    cancelText: '取消',
    cancelButtonProps: undefined,
    okButtonProps: undefined,
    confirmText: '保存',
    confirmLoading: false,
    confirmDisabled: false,
    showConfirm: true,
  },
);

defineEmits<{ cancel: [event: MouseEvent]; confirm: [event: MouseEvent] }>();
</script>

<template>
  <div class="app-modal-actions">
    <div v-if="$slots.leading" class="app-modal-actions-leading">
      <slot name="leading"></slot>
    </div>
    <div class="app-modal-actions-primary">
      <slot name="before-confirm"></slot>
      <Button
        v-bind="cancelButtonProps"
        :disabled="busy || confirmLoading || cancelButtonProps?.disabled"
        @click="$emit('cancel', $event)"
      >
        {{ cancelText }}
      </Button>
      <Button
        v-if="showConfirm"
        v-bind="okButtonProps"
        type="primary"
        :loading="confirmLoading || okButtonProps?.loading"
        :disabled="busy || confirmDisabled || okButtonProps?.disabled"
        @click="$emit('confirm', $event)"
      >
        {{ confirmText }}
      </Button>
    </div>
  </div>
</template>
