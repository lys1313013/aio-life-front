<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

import {
  getCategoryColor,
  getRelationColor,
  isBidirectionalRelation,
} from '../constants';

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
  direction?: string;
  relationType?: string;
}

interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NodeMotion {
  anchorX: number;
  anchorY: number;
  epoch: number;
  phaseX: number;
  phaseY: number;
  radiusX: number;
  radiusY: number;
  speedX: number;
  speedY: number;
}

const props = defineProps<{
  graphData: GraphPayload;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  nodeLabel?: string;
  /**
   * 暂停动画（如图谱被弹窗遮住时）。
   * 持续重绘会占用主线程，可能干扰中文输入法组合；暂停后恢复重绘并重新锚定漂游位置。
   */
  paused?: boolean;
}>();

const emit = defineEmits<{
  (e: 'node-dblclick', node: GraphNode): void;
}>();

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

const container = ref<HTMLDivElement | null>(null);
let instance: any = null;
let themeObserver: MutationObserver | null = null;
let pulseFrame: null | number = null;
let pulseClearTimer: null | ReturnType<typeof setTimeout> = null;
let initialFitTimer: null | ReturnType<typeof setTimeout> = null;
let lastMotionFrame = 0;
let motionPausedUntil = Number.POSITIVE_INFINITY;
let draggingNodeId: null | string = null;
const nodeMotions = new Map<string, NodeMotion>();
// 用户一旦手动缩放/拖动，就不再执行初始 zoomToFit
let userInteracted = false;

// canvas 无法使用 Tailwind 类，读取主题 CSS 变量适配暗色
const theme = ref({ background: '#ffffff', text: '#333333' });

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
  const fg = styles.getPropertyValue('--card-foreground').trim();
  theme.value = {
    background: card ? `hsl(${card})` : '#ffffff',
    text: fg ? `hsl(${fg})` : '#333333',
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

function hashNodeId(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return hash;
}

function createNodeMotion(node: GraphNode, now: number): NodeMotion {
  const seed = hashNodeId(node.id);
  const phaseX = ((seed % 360) * Math.PI) / 180;
  const phaseY = ((((seed >>> 8) % 360) + 70) * Math.PI) / 180;
  const radiusX = 7 + (seed % 7);
  const radiusY = 6 + ((seed >>> 4) % 7);
  const speedX = (Math.PI * 2) / (22_000 + (seed % 9000));
  const speedY = (Math.PI * 2) / (26_000 + ((seed >>> 6) % 10_000));
  const x = node.x ?? node.initialX ?? 0;
  const y = node.y ?? node.initialY ?? 0;
  const offsetX =
    Math.sin(phaseX) * radiusX + Math.sin(phaseY) * radiusX * 0.22;
  const offsetY =
    Math.cos(phaseX) * radiusY + Math.cos(phaseY) * radiusY * 0.22;

  return {
    anchorX: x - offsetX,
    anchorY: y - offsetY,
    epoch: now,
    phaseX,
    phaseY,
    radiusX,
    radiusY,
    speedX,
    speedY,
  };
}

function updateMotionAnchor(node: GraphNode) {
  const now = performance.now();
  nodeMotions.set(node.id, createNodeMotion(node, now));
}

function updateNodeMotion(now: number) {
  if (now < motionPausedUntil || now - lastMotionFrame < 32) return;
  lastMotionFrame = now;

  for (const node of props.graphData.nodes) {
    if (node.id === draggingNodeId) continue;
    let motion = nodeMotions.get(node.id);
    if (!motion) {
      motion = createNodeMotion(node, now);
      nodeMotions.set(node.id, motion);
    }
    const elapsed = now - motion.epoch;
    const primaryAngle = motion.phaseX + elapsed * motion.speedX;
    const secondaryAngle = motion.phaseY + elapsed * motion.speedY;
    const x =
      motion.anchorX +
      Math.sin(primaryAngle) * motion.radiusX +
      Math.sin(secondaryAngle) * motion.radiusX * 0.22;
    const y =
      motion.anchorY +
      Math.cos(primaryAngle) * motion.radiusY +
      Math.cos(motion.phaseY + elapsed * motion.speedY * 0.83) *
        motion.radiusY *
        0.22;
    node.x = x;
    node.y = y;
    node.fx = x;
    node.fy = y;
  }
}

function scheduleMotionStart(delay = 2400) {
  motionPausedUntil = performance.now() + delay;
  lastMotionFrame = 0;
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
  const dimmed = isNodeDimmed(node);
  const selected = node.id === focusNodeId.value;
  const baseRadius = Math.sqrt(Math.max(0, node.val ?? 20)) * 4;
  const r = selected ? baseRadius * 1.1 : baseRadius;
  const nodeColor = nodeColorOf(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const breath = (Math.sin(performance.now() / 580) + 1) / 2;

  // 节点圆
  ctx.save();
  if (dimmed) {
    // 关系线从节点圆心连接；淡化前先用画布背景遮住，避免线条透过节点
    ctx.fillStyle = theme.value.background;
    ctx.beginPath();
    ctx.arc(x, y, r + 1 / globalScale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 0.18;
  }

  // 选中态仅使用无硬边的呼吸光晕
  if (selected) {
    ctx.save();
    const glowRadius = r + (7 + breath * 2.5) / globalScale;
    const glow = ctx.createRadialGradient(x, y, r * 0.72, x, y, glowRadius);
    glow.addColorStop(0, withAlpha(nodeColor, 0.82 + breath * 0.12));
    glow.addColorStop(0.55, withAlpha(nodeColor, 0.48 + breath * 0.1));
    glow.addColorStop(1, withAlpha(nodeColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = nodeColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI, false);
  ctx.fill();

  // 名字
  const label = (node as any)[props.nodeLabel ?? 'name'] ?? '';
  if (label) {
    const fontSize = 14 / globalScale;
    ctx.font = `${selected ? 600 : 400} ${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelY = y + r + fontSize * 0.85;
    if (selected) {
      const textWidth = ctx.measureText(label).width;
      const paddingX = 6 / globalScale;
      const paddingY = 3 / globalScale;
      ctx.fillStyle = withAlpha(nodeColor, 0.16);
      ctx.strokeStyle = withAlpha(nodeColor, 0.55);
      ctx.lineWidth = 1 / globalScale;
      ctx.beginPath();
      ctx.roundRect(
        x - textWidth / 2 - paddingX,
        labelY - fontSize / 2 - paddingY,
        textWidth + paddingX * 2,
        fontSize + paddingY * 2,
        5 / globalScale,
      );
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = theme.value.text;
    ctx.fillText(label, x, labelY);
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

function drawSourceArrow(link: GraphLink, ctx: CanvasRenderingContext2D) {
  if (!isBidirectionalRelation(link.relationType, link.direction)) return;

  const source = link.source as GraphNode;
  const target = link.target as GraphNode;
  const sourceX = source.x ?? 0;
  const sourceY = source.y ?? 0;
  const dx = (target.x ?? 0) - sourceX;
  const dy = (target.y ?? 0) - sourceY;
  const distance = Math.hypot(dx, dy);
  if (!distance) return;

  const unitX = dx / distance;
  const unitY = dy / distance;
  const nodeRadius = Math.sqrt(Math.max(0, source.val ?? 20)) * 4;
  const arrowLength = props.linkDirectionalArrowLength ?? 6;
  const arrowWidth = arrowLength * 0.65;
  const tipX = sourceX + unitX * nodeRadius;
  const tipY = sourceY + unitY * nodeRadius;
  const baseX = tipX + unitX * arrowLength;
  const baseY = tipY + unitY * arrowLength;

  ctx.save();
  ctx.fillStyle = linkColorOf(link);
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX - unitY * arrowWidth, baseY + unitX * arrowWidth);
  ctx.lineTo(baseX + unitY * arrowWidth, baseY - unitX * arrowWidth);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLink(link: GraphLink, ctx: CanvasRenderingContext2D) {
  drawSourceArrow(link, ctx);
  if (!link.relationType) return;
  if (focusNodeId.value && !focusLinks.has(link)) return;
  const midX = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
  const midY = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2;
  ctx.font = '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
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
    // 节点漂游和选中光晕需要在力模拟冷却后继续逐帧绘制
    .autoPauseRedraw(false)
    .nodeVal((n: GraphNode) => n.val ?? 20)
    .linkColor(linkColorOf)
    .linkWidth((link: GraphLink) => (focusLinks.has(link) ? 2 : 1))
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .linkDirectionalArrowColor(linkColorOf)
    .onRenderFramePre(() => updateNodeMotion(performance.now()))
    .enablePointerInteraction(true)
    .onNodeClick(handleNodeClick)
    .onBackgroundClick(() => applyFocus(null))
    .onNodeDrag((node: GraphNode) => {
      // force-graph 会区分拖拽和点击；拖动节点时也应同步切换聚焦对象
      draggingNodeId = node.id;
      if (focusNodeId.value !== node.id) applyFocus(node);
    })
    .onNodeDragEnd((node: GraphNode) => {
      // 拖拽后以新位置作为缓慢漂游的中心
      applyFocus(node);
      updateMotionAnchor(node);
      draggingNodeId = null;
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject(drawNode)
    .linkCanvasObjectMode(() => 'after')
    .linkCanvasObject(drawLink)
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
  scheduleMotionStart();
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

// 弹窗打开时暂停动画，避免持续重绘占用主线程干扰输入法；恢复时重新锚定漂游起点
watch(
  () => props.paused,
  (paused) => {
    if (!instance) return;
    if (paused) {
      instance.pauseAnimation();
    } else {
      // 暂停期间 nodeMotions 的时间戳已过期，若直接恢复节点会跳到随机角度；
      // 以暂停后的当前位置重新创建漂游，保证平滑衔接
      for (const n of props.graphData.nodes) {
        updateMotionAnchor(n);
      }
      instance.resumeAnimation();
    }
  },
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
  nodeMotions.clear();
  draggingNodeId = null;
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
  scheduleMotionStart(1800);
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
