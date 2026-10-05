<script setup lang="ts">
import type { Component } from 'vue';

import type { BusinessCardItem } from './business-card-data';

import { computed, ref } from 'vue';

import BusinessCardCover from './BusinessCardCover.vue';

const props = defineProps<{
  icon: Component | string;
  items: BusinessCardItem[];
  loading: boolean;
  loadingMore: boolean;
}>();
const emit = defineEmits<{
  edit: [item: BusinessCardItem];
  more: [];
}>();
const root = ref<HTMLElement>();
const groups = computed(() =>
  [
    { label: '在读', active: true },
    { label: '想读', active: false },
  ]
    .map((group) => ({
      ...group,
      items: props.items.filter((item) => !!item.inProgress === group.active),
    }))
    .filter((group) =>
      props.loading && props.items.length === 0
        ? group.active
        : group.items.length > 0,
    ),
);
function onScroll(event: Event) {
  const el = event.currentTarget as HTMLElement;
  if (el.scrollWidth - el.scrollLeft - el.clientWidth < 48) emit('more');
}
defineExpose({
  needsMore: () =>
    [...(root.value?.querySelectorAll('.reading-shelf') ?? [])].every(
      (el) => el.scrollWidth <= el.clientWidth,
    ),
});
</script>

<template>
  <div ref="root" class="reading-shelves flex flex-col gap-4 py-1">
    <section
      v-for="group in groups"
      :key="group.label"
      :aria-label="group.label"
      class="flex min-w-0 items-center gap-3"
    >
      <h3 class="shelf-label shrink-0 text-xs text-muted-foreground">
        {{ group.label }}
      </h3>
      <div
        class="reading-shelf flex min-w-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden"
        :aria-label="`${group.label}书籍`"
        tabindex="0"
        @scroll="onScroll"
      >
        <template v-if="loading && items.length === 0">
          <div
            v-for="index in 3"
            :key="index"
            class="shelf-book shelf-placeholder animate-pulse motion-reduce:animate-none"
            role="status"
            aria-label="加载中"
          >
            <span
              class="shelf-cover block rounded-[1px] bg-muted-foreground/20"
            ></span>
          </div>
        </template>
        <template v-else>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="shelf-book rounded-[1px] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            :aria-label="`编辑${item.title}`"
            :title="item.title"
            @click="emit('edit', item)"
          >
            <BusinessCardCover
              class="shelf-cover"
              natural-ratio
              :file-id="item.fileId"
              :url="item.coverUrl"
              :icon="icon"
            />
          </button>
          <span
            v-if="loadingMore"
            class="shelf-book shelf-placeholder animate-pulse rounded-[1px] bg-muted-foreground/20 motion-reduce:animate-none"
            role="status"
            aria-label="加载更多"
          ></span>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.reading-shelves {
  --shelf-cover-height: 99px;
}

/* Match the homepage's shorter two-column cards on tablets. */
@media (min-width: 768px) and (max-width: 1023px) {
  .reading-shelves {
    --shelf-cover-height: 84px;
  }
}

.shelf-label {
  width: 16px;
  line-height: 16px;
  letter-spacing: 3px;
  writing-mode: vertical-rl;
  text-orientation: upright;
}

.reading-shelf {
  height: var(--shelf-cover-height);
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}
.reading-shelf::-webkit-scrollbar {
  display: none;
}
.shelf-book {
  flex: 0 0 auto;
  min-width: 0;
  scroll-snap-align: start;
}
.shelf-cover {
  position: relative;
  width: auto;
  height: var(--shelf-cover-height);
}
.shelf-cover::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  border: 1px solid hsl(var(--border));
  border-radius: inherit;
}
.shelf-placeholder {
  width: calc(var(--shelf-cover-height) * 2 / 3);
}
</style>
