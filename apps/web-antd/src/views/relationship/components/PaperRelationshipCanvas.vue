<script setup lang="ts">
import type { GraphData } from '#/api/relationship';

import {
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

import { usePreferences } from '@vben/preferences';

import { PaperGraph } from '../paper-graph';

const props = defineProps<{
  graphData: GraphData;
  motion: boolean;
}>();
const emit = defineEmits<{ 'person-open': [id: string] }>();
const { isDark } = usePreferences();
const stage = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const people = ref<HTMLElement>();
let graph: PaperGraph | undefined;

function readTheme() {
  return {
    dark: isDark.value,
    labelBackground: getComputedStyle(stage.value!).backgroundColor,
  };
}

onMounted(() => {
  graph = new PaperGraph(
    stage.value!,
    canvas.value!,
    people.value!,
    readTheme(),
    (id) => emit('person-open', id),
  );
  graph.setData(props.graphData);
  graph.setMotion(props.motion);
});
onBeforeUnmount(() => graph?.destroy());
onActivated(() => graph?.setMotion(props.motion));
onDeactivated(() => graph?.setMotion(false));
watch(
  () => props.graphData,
  (data) => graph?.setData(data),
);
watch(
  () => props.motion,
  (motion) => graph?.setMotion(motion),
);
watch(isDark, () => graph?.setTheme(readTheme()), { flush: 'post' });

defineExpose({
  centerOnNode: (id: string) => graph?.centerOnNode(id),
  clearFocus: () => graph?.focus(),
  fitView: () => graph?.fitView(),
  resetLayout: () => graph?.resetLayout(),
  zoomIn: () => graph?.zoom(1.25),
  zoomOut: () => graph?.zoom(0.8),
});
</script>

<template>
  <div ref="stage" class="paper-canvas" role="group" aria-label="人物图谱">
    <canvas ref="canvas" aria-hidden="true"></canvas>
    <div ref="people" class="paper-people"></div>
  </div>
</template>

<style scoped>
.paper-canvas {
  --paper: hsl(var(--card));

  position: absolute;
  inset: 0;
  overflow: hidden;
  color: hsl(var(--card-foreground));
  background: var(--paper);
  cursor: grab;
  touch-action: none;
}

.paper-canvas.is-dragging {
  cursor: grabbing;
  user-select: none;
}

.paper-canvas canvas,
.paper-people {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.paper-canvas :deep(.paper-person) {
  position: absolute;
  inset: 0 auto auto 0;
  display: grid;
  grid-template-rows: 22px 30px;
  justify-items: center;
  min-width: 42px;
  height: 52px;
  padding: 0;
  color: inherit;
  cursor: pointer;
  pointer-events: auto;
  transform: translate(-50%, -37px);
  transition: opacity 160ms ease;
}

.paper-canvas :deep(.paper-person-dot) {
  grid-row: 2;
  grid-column: 1;
  align-self: center;
  width: calc(var(--person-radius) * 2);
  height: calc(var(--person-radius) * 2);
  background: var(--person-color);
  border-radius: 50%;
}

.paper-canvas :deep(.paper-person-label) {
  grid-row: 1;
  grid-column: 1;
  align-self: end;
  max-width: clamp(56px, 16vw, 116px);
  padding-inline: 4px;
  overflow: hidden;
  font-size: clamp(12px, 1.05vw, 15px);
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  text-shadow:
    0 0 3px var(--paper),
    0 0 5px var(--paper);
  white-space: nowrap;
  border-radius: 4px;
}

.paper-canvas :deep(.paper-hub .paper-person-label) {
  font-weight: 650;
}

.paper-canvas :deep(.paper-person[aria-pressed='true'] .paper-person-label),
.paper-canvas :deep(.paper-person:focus-visible .paper-person-label) {
  background: color-mix(in srgb, var(--person-color) 17%, var(--paper));
}

.paper-canvas :deep(.paper-person.is-muted) {
  opacity: 0.4;
}

@media (prefers-reduced-motion: reduce) {
  .paper-canvas :deep(.paper-person) {
    transition: none;
  }
}
</style>
