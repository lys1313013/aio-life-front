<template>
  <span
    class="pointer-events-none flex h-4 items-center gap-1"
    role="status"
    aria-label="正在刷新"
  >
    <span
      v-for="dot in 3"
      :key="dot"
      class="refresh-dot size-1 rounded-full bg-muted-foreground/50"
      :style="{ animationDelay: `${(dot - 1) * 150}ms` }"
      aria-hidden="true"
    ></span>
  </span>
</template>

<style scoped>
.refresh-dot {
  animation: refresh-pulse 1.2s ease-in-out infinite;
}
@keyframes refresh-pulse {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .refresh-dot {
    animation: none;
  }
}
</style>
