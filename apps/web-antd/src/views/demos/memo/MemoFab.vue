<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue';
import { Button } from 'ant-design-vue';

defineEmits(['click']);
</script>

<template>
  <div class="fixed bottom-8 right-8 z-50">
    <Button
      type="primary"
      shape="circle"
      size="large"
      class="!flex !h-14 !w-14 !items-center !justify-center !shadow-lg transition-transform duration-200 hover:!scale-110"
      @click="$emit('click')"
    >
      <template #icon>
        <PlusOutlined class="!text-2xl" />
      </template>
    </Button>
  </div>
</template>
