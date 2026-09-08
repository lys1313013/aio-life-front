<script lang="ts" setup>
import { Spin } from 'ant-design-vue';

interface Props {
  minHeight?: string;
  size?: 'default' | 'large' | 'small';
}

withDefaults(defineProps<Props>(), {
  minHeight: '320px',
  size: 'large',
});
</script>

<template>
  <div
    class="content-loading"
    :style="{ minHeight }"
    role="status"
    aria-label="加载中"
  >
    <Spin :size="size" />
  </div>
</template>

<style scoped>
.content-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}
</style>
