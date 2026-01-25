<script setup lang="ts">
import { ref } from 'vue';

import type { WorkbenchQuickNavItem } from '../typing';

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
    <CardContent class="flex flex-wrap p-0">
      <template v-for="(item, index) in items" :key="item.title">
        <div
          :class="{
            'border-r-0': index % 3 === 2,
            'border-b-0': index < 3,
            'pb-2 sm:pb-4': index > 2,
            'rounded-bl-xl': index === items.length - 3,
            'rounded-br-xl': index === items.length - 1,
          }"
          class="flex-col-center border-border group w-1/3 cursor-pointer border-r border-t py-4 hover:shadow-xl sm:py-8"
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
          <span class="mt-1 truncate text-xs sm:mt-2 sm:text-base">{{ item.title }}</span>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
