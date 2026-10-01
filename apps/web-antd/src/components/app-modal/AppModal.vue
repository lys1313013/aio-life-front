<script setup lang="ts">
import type { ButtonProps } from 'ant-design-vue';

import type { StyleValue } from 'vue';

import { computed, provide, reactive, ref, useAttrs, useSlots } from 'vue';

import { handleEnterSubmit } from '@vben/utils';

import { Modal } from 'ant-design-vue';

import AppModalActions from './AppModalActions.vue';
import { modalFooterKey } from './context';

import './modal.css';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    busy?: boolean;
    cancelButtonProps?: ButtonProps;
    cancelText?: string;
    confirmLoading?: boolean;
    footer?: false | null;
    okButtonProps?: ButtonProps;
    okText?: string;
    open?: boolean;
    submitOnEnter?: boolean;
    title?: null | string;
    width?: number | string;
  }>(),
  {
    open: false,
    submitOnEnter: true,
    title: undefined,
    width: 640,
    footer: undefined,
    busy: false,
    confirmLoading: false,
    okText: '保存',
    cancelText: '取消',
    cancelButtonProps: undefined,
    okButtonProps: undefined,
  },
);
const emit = defineEmits<{
  cancel: [event: MouseEvent];
  ok: [event: MouseEvent];
  'update:open': [value: boolean];
}>();
const attrs = useAttrs();
const slots = useSlots();
const footerTarget = ref<HTMLElement>();
const footers = reactive(new Map<symbol, boolean>());
const operations = reactive(new Map<symbol, boolean>());
const isBusy = computed(
  () =>
    props.busy ||
    props.confirmLoading ||
    [...footers.values(), ...operations.values()].some(Boolean),
);
provide(modalFooterKey, {
  target: footerTarget,
  busy: isBusy,
  setBusy: (id, busy) => operations.set(id, busy),
  clearBusy: (id) => operations.delete(id),
  register: (id, busy) => footers.set(id, busy),
  unregister: (id) => footers.delete(id),
});

function cancel(event: MouseEvent) {
  if (isBusy.value || props.cancelButtonProps?.disabled) return;
  emit('cancel', event);
  emit('update:open', false);
}
function confirm(event: MouseEvent) {
  if (!isBusy.value && !props.okButtonProps?.disabled) emit('ok', event);
}
function onEnter(event: KeyboardEvent) {
  if (!props.open || !props.submitOnEnter) return;
  const button = footerTarget.value?.querySelector<HTMLButtonElement>(
    '[data-modal-confirm]',
  );
  if (!button) return;
  handleEnterSubmit(
    event,
    () => button.click(),
    isBusy.value ||
      button.disabled ||
      button.getAttribute('aria-disabled') === 'true' ||
      button.classList.contains('ant-btn-loading'),
  );
}
</script>

<template>
  <Modal
    v-bind="attrs"
    :open="open"
    :width="width"
    :title="title || String(attrs['aria-label'] || '对话框')"
    :aria-label="attrs['aria-label'] || title || '对话框'"
    class="app-modal"
    :class="[attrs.class]"
    :wrap-class-name="
      ['app-modal-wrap', attrs.wrapClassName || attrs['wrap-class-name']]
        .filter(Boolean)
        .join(' ')
    "
    centered
    :closable="false"
    :keyboard="!isBusy && attrs.keyboard !== false"
    :mask-closable="
      !isBusy &&
      attrs.maskClosable !== false &&
      attrs['mask-closable'] !== false
    "
    :mask-style="{
      background: 'hsl(var(--overlay))',
      backdropFilter: 'blur(1px)',
    }"
    :body-style="{ padding: 0 }"
    :footer="null"
    @cancel="cancel"
  >
    <div
      class="app-modal-body app-modal-form"
      :style="(attrs.bodyStyle || attrs['body-style']) as StyleValue"
      :aria-busy="isBusy"
      data-enter-submit-scope
      @keydown.capture="onEnter"
    >
      <div v-if="slots.toolbar" class="app-modal-toolbar">
        <slot name="toolbar"></slot>
      </div>
      <slot></slot>
    </div>
    <div v-if="footer !== false" ref="footerTarget" class="app-modal-footer">
      <template v-if="footers.size === 0">
        <slot name="footer">
          <AppModalActions
            :busy="isBusy"
            :confirm-loading="confirmLoading"
            :show-confirm="footer !== null"
            :cancel-text="footer === null ? '关闭' : cancelText"
            :confirm-text="okText"
            :cancel-button-props="cancelButtonProps"
            :ok-button-props="okButtonProps"
            @cancel="cancel"
            @confirm="confirm"
          >
            <template v-if="slots['footer-leading']" #leading>
              <slot name="footer-leading"></slot>
            </template>
          </AppModalActions>
        </slot>
      </template>
    </div>
  </Modal>
</template>
