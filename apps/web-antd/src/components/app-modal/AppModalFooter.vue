<script setup lang="ts">
import { computed, inject, onBeforeUnmount, watchEffect } from 'vue';

import AppModalActions from './AppModalActions.vue';
import { modalFooterKey } from './context';

// Nested form components keep their own callbacks while rendering in the shell's footer.
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{ busy?: boolean; confirmLoading?: boolean }>(),
  {
    busy: false,
    confirmLoading: false,
  },
);
const context = inject(modalFooterKey, undefined);
const id = Symbol('footer');
const shellBusy = computed(() => props.busy || context?.busy.value || false);
watchEffect(() => context?.register(id, props.busy || props.confirmLoading));
onBeforeUnmount(() => context?.unregister(id));
</script>

<template>
  <Teleport
    v-if="!context || context.target.value"
    :to="context?.target.value || 'body'"
    :disabled="!context"
  >
    <div class="app-modal-footer-content">
      <slot>
        <AppModalActions
          v-bind="$attrs"
          :busy="shellBusy"
          :confirm-loading="confirmLoading"
        >
          <template v-for="(_, name) in $slots" #[name]="slotProps">
            <slot :name="name" v-bind="slotProps || {}"></slot>
          </template>
        </AppModalActions>
      </slot>
    </div>
  </Teleport>
</template>
