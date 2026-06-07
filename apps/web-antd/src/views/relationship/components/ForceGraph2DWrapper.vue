<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

interface GraphLink {
  source: string;
  target: string;
  relationType?: string;
}

interface GraphPayload {
  nodes: Array<{ id: string; name: string }>;
  links: GraphLink[];
}

const props = defineProps<{
  backgroundColor?: string;
  graphData: GraphPayload;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  nodeLabel?: string;
  nodeVal?: number;
}>();

const emit = defineEmits<{
  (e: 'node-click', node: any): void;
}>();

const container = ref<HTMLDivElement | null>(null);
let instance: any = null;

onMounted(() => {
  if (!container.value) return;

  instance = new (ForceGraph2D as any)(container.value);
  instance
    .backgroundColor(props.backgroundColor ?? '#fff')
    .nodeLabel((n: any) => n[props.nodeLabel ?? 'name'] ?? '')
    .nodeVal(props.nodeVal ?? 20)
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .enablePointerInteraction(true)
    .onNodeClick((node: any) => emit('node-click', node))
    .nodeCanvasObjectMode(() => 'after')
    .nodeCanvasObject(
      (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node[props.nodeLabel ?? 'name'] ?? '';
        if (!label) return;
        const fontSize = 14 / globalScale;
        ctx.font = `${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y + (node.val ?? 20) + fontSize * 0.7);
      },
    )
    .nodePointerAreaPaint(
      (node: any, color: string, ctx: CanvasRenderingContext2D) => {
        const r = (node.val ?? 20) + 6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fill();
      },
    );

  instance.d3Force('charge').strength(-260);
  instance.d3Force('link').distance(80);
  instance
    .cooldownTicks(30)
    .cooldownTime(800)
    .d3VelocityDecay(0.6)
    .d3AlphaDecay(0.1)
    .graphData(props.graphData);

  setTimeout(() => instance?.zoomToFit(400, 60), 600);
});

watch(
  () => props.graphData,
  (val) => {
    instance?.graphData(val);
  },
  { deep: true },
);

onBeforeUnmount(() => {
  instance?._destructor?.();
  instance = null;
});
</script>

<template>
  <div ref="container" class="force-graph-wrapper"></div>
</template>

<style scoped>
.force-graph-wrapper {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
