<script setup lang="ts">
import type { WorkbenchQuickNavItem } from '../typing';

import { ref } from 'vue';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  VbenIcon,
} from '@vben-core/shadcn-ui';

interface Props {
  items?: WorkbenchQuickNavItem[];
  title: string;
}

defineOptions({
  name: 'WorkbenchQuickNav',
});

withDefaults(defineProps<Props>(), {
  items: () => [],
});

const emit = defineEmits(['click', 'long-press']);

const longPressTimer = ref<ReturnType<typeof setTimeout>>();
const isLongPress = ref(false);

function startLongPress(item: WorkbenchQuickNavItem) {
  isLongPress.value = false;
  longPressTimer.value = setTimeout(() => {
    isLongPress.value = true;
    emit('long-press', item);
    // 震动反馈
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, 500);
}

function endLongPress() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = undefined;
  }
}

function handleItemClick(item: WorkbenchQuickNavItem) {
  if (isLongPress.value) {
    isLongPress.value = false;
    return;
  }
  emit('click', item);
}
</script>

<template>
  <Card class="select-none">
    <CardHeader class="py-4">
      <CardTitle class="text-lg">{{ title }}</CardTitle>
    </CardHeader>
    <CardContent class="grid grid-cols-4 gap-1 p-2">
      <template v-for="item in items" :key="item.title">
        <div
          class="flex-col-center hover:bg-accent group cursor-pointer rounded-xl py-2 transition-all sm:py-4"
          @click="handleItemClick(item)"
          @mousedown="startLongPress(item)"
          @mouseleave="endLongPress"
          @mouseup="endLongPress"
          @touchend="endLongPress"
          @touchmove="endLongPress"
          @touchstart="startLongPress(item)"
        >
          <VbenIcon
            :color="item.color"
            :icon="item.icon"
            class="size-6 transition-all duration-300 group-hover:scale-125 sm:size-7"
          />
          <span class="mt-1 truncate text-xs sm:mt-2 sm:text-base">{{
            item.title
          }}</span>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
