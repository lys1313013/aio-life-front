<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

interface GraphLink {
  source: string;
  target: string;
  relationType?: string;
}

interface GraphPayload {
  nodes: Array<{ id: string; name: string; relationshipCount?: number; val?: number }>;
  links: GraphLink[];
}

// 关系类型颜色映射
const relationColors: Record<string, string> = {
  '父母': '#e91e63',
  '母亲': '#e91e63',
  '父亲': '#e91e63',
  '子女': '#4caf50',
  '配偶': '#ff9800',
  '恋人': '#ff5722',
  '兄弟姐妹': '#9c27b0',
  '朋友': '#2196f3',
  '挚友': '#00bcd4',
  '同学': '#009688',
  '同事': '#607d8b',
  '老师': '#795548',
  '学生': '#8bc34a',
  'mentor': '#3f51b5',
  '前任': '#f44336',
  '暗恋': '#e91e63',
  '其他': '#9e9e9e',
};

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

const initGraph = () => {
  if (!container.value) return;

  instance = new (ForceGraph2D as any)(container.value);

  instance
    .backgroundColor(props.backgroundColor ?? '#fff')
    .nodeLabel((n: any) => n[props.nodeLabel ?? 'name'] ?? '')
    .nodeVal((n: any) => n.val ?? props.nodeVal ?? 20)
    .linkColor((link: any) => relationColors[link.relationType] || '#bbb')
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .linkDirectionalArrowColor((link: any) => relationColors[link.relationType] || '#bbb')
    .enablePointerInteraction(true)
    .onNodeClick((node: any) => emit('node-click', node))
    .nodeColor(() => '#3f51b5')
    .linkCanvasObjectMode(() => 'after')
    .linkCanvasObject(
      (link: any, ctx: CanvasRenderingContext2D) => {
        // 在连线中间显示关系类型标签
        if (!link.relationType) return;
        const midX = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
        const midY = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2;
        ctx.font = '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = relationColors[link.relationType] || '#999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.relationType, midX, midY - 10);
      },
    )
    .nodeCanvasObjectMode(() => 'after')
    .nodeCanvasObject(
      (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node[props.nodeLabel ?? 'name'] ?? '';
        if (!label) return;
        const fontSize = 14 / globalScale;

        // 名字
        ctx.font = `bold ${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
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
};

onMounted(() => {
  initGraph();
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
