<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { Alert } from 'ant-design-vue';

interface Props {
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: false,
  errorMessage: '加载失败，请检查网络连接或绑定信息。',
});
</script>

<template>
  <Page title="" content-class="p-0">
    <div class="p-3 md:p-6">
      <template v-if="loading">
        <slot name="skeleton"></slot>
      </template>

      <template v-else-if="error">
        <div class="w-full py-12 text-center">
          <Alert
            :description="errorMessage"
            message="加载失败"
            show-icon
            type="error"
            class="inline-block text-left"
          />
        </div>
      </template>

      <template v-else>
        <slot></slot>
      </template>
    </div>
  </Page>
</template>
