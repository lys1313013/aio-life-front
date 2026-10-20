<script setup lang="ts">
import { computed } from 'vue';

import { figurePaths } from './figure';

const props = defineProps<{ gender: null | string }>();
const paths = computed(() =>
  props.gender === 'female' ? figurePaths.female : figurePaths.male,
);
</script>

<template>
  <svg
    viewBox="0 0 240 470"
    role="img"
    aria-label="身体尺寸示意轮廓"
    class="body-figure"
    :class="{ 'outline-only': props.gender !== 'female' }"
  >
    <path
      v-for="(path, index) in paths"
      :key="index"
      :d="path.d"
      :class="{ detail: path.detail }"
    />
  </svg>
</template>

<style scoped>
.body-figure {
  color: hsl(var(--muted-foreground) / 65%);
}

path {
  fill: hsl(var(--muted) / 35%);
  stroke: currentcolor;
  stroke-width: 1.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.outline-only path {
  fill: none;
}

.detail {
  fill: none;
  stroke-width: 0.85;
  opacity: 0.6;
}
</style>
