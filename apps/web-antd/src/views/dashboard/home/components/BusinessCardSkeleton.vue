<script setup lang="ts">
withDefaults(
  defineProps<{ count?: number; label?: string; media?: boolean }>(),
  {
    count: 3,
    label: '加载中',
  },
);
</script>

<template>
  <div
    class="animate-pulse motion-reduce:animate-none"
    role="status"
    :aria-label="label"
  >
    <div
      v-for="row in count"
      :key="row"
      class="flex items-center gap-3 px-1 py-2"
      :class="media ? 'min-h-[76px]' : 'min-h-16'"
      aria-hidden="true"
    >
      <span
        class="shrink-0 bg-muted-foreground/20"
        :class="media ? 'h-[60px] w-10 rounded-md' : 'size-9 rounded-xl'"
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
