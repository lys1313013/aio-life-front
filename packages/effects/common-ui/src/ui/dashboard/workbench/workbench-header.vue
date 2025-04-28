<script lang="ts" setup>
import { VbenAvatar } from '@vben-core/shadcn-ui';

interface Props {
  avatar?: string;
}

defineOptions({
  name: 'WorkbenchHeader',
});

withDefaults(defineProps<Props>(), {
  avatar: '',
});

// 计算今天是今年的第几天
const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// 新增数据数组
const stats = [
  { name: '待办', value: '2/10' },
  { name: '项目', value: '8' },
  { name: '今年', value: getDayOfYear() },
];
</script>
<template>
  <div class="card-box p-4 py-6 lg:flex">
    <VbenAvatar :src="avatar" class="size-20" />
    <div
      v-if="$slots.title || $slots.description"
      class="flex flex-col justify-center md:ml-6 md:mt-0"
    >
      <h1 v-if="$slots.title" class="text-md font-semibold md:text-xl">
        <slot name="title"></slot>
      </h1>
      <span v-if="$slots.description" class="text-foreground/80 mt-1">
        <slot name="description"></slot>
      </span>
    </div>
    <div class="mt-4 flex flex-1 justify-end md:mt-0">
      <!-- 使用 v-for 循环渲染数据 -->
      <div
        v-for="(stat, index) in stats"
        :key="index"
        :class="{
          'flex flex-col justify-center text-right': true,
          'mx-12 md:mx-16': index === 1,
          'mr-4 md:mr-10': index === 2
        }"
      >
        <span class="text-foreground/80">{{ stat.name }}</span>
        <span class="text-2xl">{{ stat.value }}</span>
      </div>
    </div>
  </div>
</template>
