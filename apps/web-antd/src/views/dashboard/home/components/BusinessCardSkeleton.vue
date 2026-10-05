<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number;
    label?: string;
    media?: boolean;
    rowHeight?: number;
  }>(),
  {
    count: 1,
    rowHeight: 64,
    label: '加载中',
  },
);
</script>

<template>
  <div
    class="animate-pulse motion-reduce:animate-none"
    :class="{ 'media-row-grid media-skeleton': media }"
    role="status"
    :aria-label="label"
  >
    <div
      v-for="row in count"
      :key="row"
      class="box-border flex items-center px-1 py-2"
      :style="{ height: `${rowHeight}px` }"
      :class="media ? 'gap-2.5' : 'gap-3'"
      aria-hidden="true"
    >
      <span
        class="shrink-0 bg-muted-foreground/20"
        :class="media ? 'h-12 w-8 rounded-md' : 'size-9 rounded-xl'"
      ></span>
      <span class="flex min-w-0 flex-1 flex-col gap-2.5">
        <span
          class="h-3 rounded bg-muted-foreground/20"
          :class="row === 2 ? 'w-2/5' : 'w-3/5'"
        ></span>
        <span class="h-2.5 w-1/3 rounded bg-muted-foreground/20"></span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.media-skeleton > :nth-child(n + 4) {
  display: none;
}

@container business-card (min-width: 380px) {
  .media-skeleton > :nth-child(n + 4) {
    display: flex;
  }
}
</style>
