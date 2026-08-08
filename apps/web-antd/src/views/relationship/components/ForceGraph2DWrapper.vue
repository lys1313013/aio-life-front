<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

import { getCategoryColor, getRelationColor } from '../constants';

// 简易碰撞力，避免节点重叠（不引入 d3 类型依赖）
function forceCollideSimple(radius: number) {
  let nodes: any[] = [];
  const force = (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = radius * 2;
        if (dist < minDist) {
          const push = ((minDist - dist) / dist) * 0.5 * alpha;
          dx *= push;
          dy *= push;
          a.vx -= dx;
          a.vy -= dy;
          b.vx += dx;
          b.vy += dy;
        }
      }
    }
  };
  force.initialize = (n: any[]) => {
    nodes = n;
  };
  return force;
}

interface GraphNode {
  id: string;
  name: string;
  category?: string;
  relationshipCount?: number;
  val?: number;
  initialX?: number;
  initialY?: number;
  x?: number;
  y?: number;
  fx?: null | number;
  fy?: null | number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: any;
  target: any;
  relationType?: string;
}

interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
}

const props = defineProps<{
  graphData: GraphPayload;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  nodeLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'node-dblclick', node: GraphNode): void;
}>();

const container = ref<HTMLDivElement | null>(null);
let instance: any = null;
let themeObserver: MutationObserver | null = null;
let pulseFrame: null | number = null;
let pulseClearTimer: null | ReturnType<typeof setTimeout> = null;
let initialFitTimer: null | ReturnType<typeof setTimeout> = null;
// 用户一旦手动缩放/拖动，就不再执行初始 zoomToFit
let userInteracted = false;

// canvas 无法使用 Tailwind 类，读取主题 CSS 变量适配暗色
const theme = ref({ background: '#ffffff', text: '#666666' });

// 聚焦状态
const focusNodeId = ref<null | string>(null);
let neighborIds = new Set<string>();
let focusLinks = new Set<GraphLink>();

// 搜索定位脉冲
const pulseNodeId = ref<null | string>(null);
let pulseStart = 0;

// 手动双击检测（force-graph 无 onNodeDblClick）
let lastClick: { id: string; time: number } = { id: '', time: 0 };

function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  const card = styles.getPropertyValue('--card').trim();
  const fg = styles.getPropertyValue('--muted-foreground').trim();
  theme.value = {
    background: card ? `hsl(${card})` : '#ffffff',
    text: fg ? `hsl(${fg})` : '#666666',
  };
  instance?.backgroundColor(theme.value.background);
  instance?.refresh?.();
}

function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return hex;
  const [r, g, b] = [1, 2, 3].map((i) => Number.parseInt(m[i]!, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function linkColorOf(link: GraphLink): string {
  const base = getRelationColor(link.relationType);
  if (focusNodeId.value && !focusLinks.has(link)) {
    return withAlpha(base, 0.12);
  }
  return base;
}

function nodeColorOf(node: GraphNode): string {
  return getCategoryColor(node.category);
}

function linkIdOf(endpoint: any): string {
  return typeof endpoint === 'object' ? endpoint.id : String(endpoint);
}

function applyFocus(node: GraphNode | null) {
  focusNodeId.value = node?.id ?? null;
  neighborIds = new Set();
  focusLinks = new Set();
  if (node) {
    for (const link of props.graphData.links) {
      const s = linkIdOf(link.source);
      const t = linkIdOf(link.target);
      if (s === node.id || t === node.id) {
        focusLinks.add(link);
        neighborIds.add(s === node.id ? t : s);
      }
    }
  }
  instance?.refresh?.();
}

function isNodeDimmed(node: GraphNode): boolean {
  return (
    focusNodeId.value !== null &&
    node.id !== focusNodeId.value &&
    !neighborIds.has(node.id)
  );
}

function handleNodeClick(node: GraphNode) {
  const now = Date.now();
  if (lastClick.id === node.id && now - lastClick.time < 350) {
    lastClick = { id: '', time: 0 };
    emit('node-dblclick', node);
    return;
  }
  lastClick = { id: node.id, time: now };
  applyFocus(node);
}

function startPulseLoop() {
  if (pulseFrame !== null) return;
  const tick = () => {
    if (!pulseNodeId.value) {
      pulseFrame = null;
      return;
    }
    instance?.refresh?.();
    pulseFrame = requestAnimationFrame(tick);
  };
  pulseFrame = requestAnimationFrame(tick);
}

function drawNode(
  node: GraphNode,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
) {
  const r = Math.sqrt(Math.max(0, node.val ?? 20)) * 4;
  const dimmed = isNodeDimmed(node);
  const nodeColor = nodeColorOf(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  // 节点圆
  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.18;
  ctx.fillStyle = nodeColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  ctx.fill();

  // 聚焦节点描边
  if (node.id === focusNodeId.value) {
    ctx.lineWidth = 2.5 / globalScale;
    ctx.strokeStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(x, y, r + 3 / globalScale, 0, 2 * Math.PI, false);
    ctx.stroke();
  }

  // 名字
  const label = (node as any)[props.nodeLabel ?? 'name'] ?? '';
  if (label) {
    const fontSize = 14 / globalScale;
    ctx.font = `400 ${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = theme.value.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + r + fontSize * 0.7);
  }
  ctx.restore();

  // 搜索定位脉冲（不受淡出影响）
  if (node.id === pulseNodeId.value) {
    const t = ((performance.now() - pulseStart) / 1000) % 1;
    ctx.save();
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeStyle = withAlpha(nodeColorOf(node), Math.max(0, 0.9 - t * 0.9));
    ctx.beginPath();
    ctx.arc(x, y, r + 4 + t * 16, 0, 2 * Math.PI, false);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLinkLabel(link: GraphLink, ctx: CanvasRenderingContext2D) {
  if (!link.relationType) return;
  if (focusNodeId.value && !focusLinks.has(link)) return;
  const midX = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
  const midY = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2;
  ctx.font =
    '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = linkColorOf(link);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(link.relationType, midX, midY - 10);
}

const initGraph = () => {
  if (!container.value) return;
  readTheme();

  instance = new (ForceGraph2D as any)(container.value);

  instance
    .backgroundColor(theme.value.background)
    .nodeVal((n: GraphNode) => n.val ?? 20)
    .linkColor(linkColorOf)
    .linkWidth((link: GraphLink) => (focusLinks.has(link) ? 2 : 1))
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .linkDirectionalArrowColor(linkColorOf)
    .enablePointerInteraction(true)
    .onNodeClick(handleNodeClick)
    .onBackgroundClick(() => applyFocus(null))
    .onNodeDragEnd((node: GraphNode) => {
      // 拖拽后固定在当前位置
      node.fx = node.x;
      node.fy = node.y;
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject(drawNode)
    .linkCanvasObjectMode(() => 'after')
    .linkCanvasObject(drawLinkLabel)
    .nodePointerAreaPaint(
      (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        const r = Math.sqrt(Math.max(0, node.val ?? 20)) * 4 + 6;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI, false);
        ctx.fill();
      },
    );

  // 力导向参数：让图自由舒展、避免重叠
  instance.d3Force('charge')?.strength(-380).distanceMax(500);
  instance.d3Force('link')?.distance(120);
  instance.d3Force('collide', forceCollideSimple(34));
  instance
    .cooldownTime(8000)
    .d3VelocityDecay(0.35)
    .d3AlphaDecay(0.022)
    .graphData(props.graphData);

  // 用户手动操作（滚轮缩放/按下拖动）后，不再自动重置视图
  const markInteracted = () => {
    userInteracted = true;
  };
  container.value.addEventListener('wheel', markInteracted, { passive: true });
  container.value.addEventListener('pointerdown', markInteracted);

  initialFitTimer = setTimeout(() => {
    if (!userInteracted) instance?.zoomToFit(600, 60);
  }, 1200);
};

onMounted(() => {
  initGraph();
  themeObserver = new MutationObserver(readTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

watch(
  () => props.graphData,
  (val) => {
    // 聚焦节点被筛掉时清除聚焦
    if (
      focusNodeId.value &&
      !val.nodes.some((n) => n.id === focusNodeId.value)
    ) {
      applyFocus(null);
    }
    instance?.graphData(val);
  },
  // 不能 deep：节点 x/y 每帧被力模拟改写，deep 会导致拖动时反复回灌数据
);

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
  if (pulseFrame !== null) cancelAnimationFrame(pulseFrame);
  if (pulseClearTimer) clearTimeout(pulseClearTimer);
  if (initialFitTimer) clearTimeout(initialFitTimer);
  instance?._destructor?.();
  instance = null;
});

// ==================== 暴露给父组件 ====================
function centerOnNode(id: string) {
  const node = props.graphData.nodes.find((n) => n.id === id);
  if (!node || node.x === undefined || node.y === undefined) return;
  instance?.centerAt(node.x, node.y, 600);
  const targetZoom = Math.max(instance?.zoom() ?? 1, 2.5);
  instance?.zoom(targetZoom, 600);
  pulseNodeId.value = id;
  pulseStart = performance.now();
  startPulseLoop();
  if (pulseClearTimer) clearTimeout(pulseClearTimer);
  pulseClearTimer = setTimeout(() => {
    pulseNodeId.value = null;
  }, 2600);
}

function zoomIn() {
  instance?.zoom((instance?.zoom() ?? 1) * 1.4, 300);
}

function zoomOut() {
  instance?.zoom((instance?.zoom() ?? 1) / 1.4, 300);
}

function fitView() {
  instance?.zoomToFit(500, 60);
}

function resetLayout() {
  for (const n of props.graphData.nodes) {
    n.x = n.initialX;
    n.y = n.initialY;
    n.vx = 0;
    n.vy = 0;
    n.fx = null;
    n.fy = null;
  }
  applyFocus(null);
  instance?.d3ReheatSimulation?.();
  setTimeout(() => instance?.zoomToFit(600, 60), 1200);
}

defineExpose({ centerOnNode, fitView, resetLayout, zoomIn, zoomOut });
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
