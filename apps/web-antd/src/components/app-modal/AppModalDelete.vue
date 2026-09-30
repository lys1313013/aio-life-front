<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watchEffect } from 'vue';

import { DeleteOutlined } from '@ant-design/icons-vue';
import { Button, Popconfirm } from 'ant-design-vue';

import { modalFooterKey } from './context';

const props = withDefaults(
  defineProps<{
    action: () => unknown;
    disabled?: boolean;
    loading?: boolean;
    title?: string;
  }>(),
  {
    disabled: false,
    loading: false,
    title: '确定删除这条记录吗？',
  },
);
const pending = ref(false);
const context = inject(modalFooterKey, undefined);
const id = Symbol('delete');
const blocked = computed(() => props.disabled || !!context?.busy.value);
watchEffect(() => context?.setBusy(id, pending.value || props.loading));
onBeforeUnmount(() => context?.clearBusy(id));
async function confirm() {
  if (pending.value || blocked.value || props.loading) return;
  pending.value = true;
  try {
    await props.action();
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <Popconfirm
    :title="title"
    placement="topLeft"
    ok-text="删除"
    cancel-text="取消"
    :disabled="blocked || pending || loading"
    :ok-button-props="{ loading: pending || loading }"
    @confirm="confirm"
  >
    <Button
      type="text"
      danger
      aria-label="删除"
      :loading="pending || loading"
      :disabled="blocked"
    >
      <template #icon><DeleteOutlined /></template>
    </Button>
  </Popconfirm>
</template>
