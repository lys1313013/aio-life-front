<script setup lang="ts" generic="T extends { cardKey: string; title: string }">
import { computed, ref, shallowRef, watch } from 'vue';

import draggable from 'vuedraggable';

import { useHomeCardsStore } from '#/store/home-cards';

import { mergeVisibleCardOrder } from '../utils/card-order';

const props = defineProps<{
  group: 'overview' | 'section';
  items: T[];
  visible?: (item: T) => boolean;
}>();
const store = useHomeCardsStore();
const draft = shallowRef<T[]>([]);
const dragging = ref(false);
const disabled = computed(() => store.loading || !!store.busy);
const signature = () =>
  JSON.stringify(
    store.items.map((item) => [item.cardKey, item.enabled, item.sortOrder]),
  );
let startedWith = '';
let suppressUntil = 0;
function blockClick(event: MouseEvent) {
  if (dragging.value || Date.now() < suppressUntil) {
    event.preventDefault();
    event.stopPropagation();
  }
}
function sync() {
  draft.value = [...props.items];
}
watch(
  () => props.items,
  () => {
    if (!dragging.value) sync();
  },
  { immediate: true },
);
function start() {
  dragging.value = true;
  startedWith = signature();
}
async function save() {
  if (disabled.value || startedWith !== signature()) {
    sync();
    return;
  }
  const visibleKeys = draft.value
    .filter((item) => props.visible?.(item) !== false)
    .map((item) => item.cardKey);
  const keys = mergeVisibleCardOrder(store.items, props.group, visibleKeys);
  const previous = store.items
    .filter((item) => item.group === props.group)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.cardKey);
  if (keys.every((key, index) => key === previous[index])) {
    sync();
    return;
  }
  try {
    return await store.reorder(props.group, keys);
  } catch {
    /* The request interceptor reports the error; restore the saved order. */
  } finally {
    sync();
  }
}
async function end() {
  dragging.value = false;
  suppressUntil = Date.now() + 450;
  await save();
}
async function keyboard(item: T, direction: number) {
  if (disabled.value) return;
  const rows = draft.value.filter((row) => props.visible?.(row) !== false);
  const index = rows.findIndex((row) => row.cardKey === item.cardKey);
  const destination = index + direction;
  if (index < 0 || !rows[destination]) return;
  startedWith = signature();
  rows.splice(destination, 0, rows.splice(index, 1)[0]!);
  const order = mergeVisibleCardOrder(
    store.items,
    props.group,
    rows.map((row) => row.cardKey),
  );
  draft.value = [...draft.value].sort(
    (a, b) => order.indexOf(a.cardKey) - order.indexOf(b.cardKey),
  );
  await save();
}
</script>
<template>
  <draggable
    v-model="draft"
    item-key="cardKey"
    filter="button:not(.card-header-refresh):not(.home-card-title), a, input, textarea, select, [contenteditable=true], .goal-sort-row"
    :prevent-on-filter="false"
    :animation="160"
    :delay="300"
    :delay-on-touch-only="false"
    :touch-start-threshold="6"
    :disabled="disabled"
    :force-fallback="true"
    :fallback-on-body="true"
    ghost-class="home-sort-ghost"
    chosen-class="home-sort-chosen"
    :aria-busy="store.busy === group"
    :data-sort-group="group"
    @start="start"
    @end="end"
  >
    <template #item="{ element: item }">
      <div
        v-show="visible?.(item) !== false"
        class="home-sort-cell"
        :data-card-key="item.cardKey"
        tabindex="0"
        :aria-label="`${item.title}卡片，长按拖动排序，Alt 加上下方向键调整`"
        @click.capture="blockClick"
        @contextmenu.prevent
        @keydown.alt.up.prevent.self="keyboard(item, -1)"
        @keydown.alt.down.prevent.self="keyboard(item, 1)"
      >
        <slot :item="item"></slot>
      </div>
    </template>
  </draggable>
</template>
<style scoped>
.home-sort-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.home-sort-chosen {
  cursor: grabbing;
  outline: 1px solid hsl(var(--primary) / 50%);
  outline-offset: -1px;
  border-radius: 12px;
  box-shadow: 0 4px 16px hsl(var(--foreground) / 12%);
}

.home-sort-ghost {
  opacity: 0.35;
}
</style>
