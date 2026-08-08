<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

import { fetchAuthImageUrl } from '#/utils/file';

import { getCategoryColor, getRelationColor } from '../constants';

interface GraphLink {
  source: any;
  target: any;
  relationType?: string;
}

interface GraphNode {
  id: string;
  name: string;
  avatar?: string;
  category?: string;
  isCenter?: boolean;
  relationshipCount?: number;
  val?: number;
  x?: number;
  y?: number;
  __avatarImg?: HTMLImageElement;
}

interface GraphPayload {
  links: GraphLink[];
  nodes: GraphNode[];
}

const props = defineProps<{
  graphData: GraphPayload;
  /** 图例点选高亮的关系类型，null 表示不高亮 */
  highlightRelationType?: null | string;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  nodeLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'node-click', node: any): void;
}>();

const container = ref<HTMLDivElement | null>(null);
let instance: any = null;
let themeObserver: MutationObserver | null = null;

// ==================== 主题颜色 ====================
interface ThemeColors {
  bg: string;
  label: string;
  muted: string;
}

const theme = ref<ThemeColors>({ bg: '', label: '', muted: '' });

/** 读取 CSS 变量（HSL 通道格式）并转成 canvas 可用的 hsl() 颜色 */
function hslVar(name: string, fallback: string): string {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    const h = Number.parseFloat(parts[0]!);
    const s = Number.parseFloat(parts[1]!);
    const l = Number.parseFloat(parts[2]!);
    if (![h, s, l].some(Number.isNaN)) {
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
  }
  return fallback;
}

function readTheme() {
  const dark = document.documentElement.classList.contains('dark');
  theme.value = {
    bg: hslVar('--card', dark ? 'hsl(222, 10%, 12%)' : 'hsl(0, 0%, 100%)'),
    label: hslVar(
      '--card-foreground',
      dark ? 'hsl(210, 40%, 96%)' : 'hsl(222, 47%, 11%)',
    ),
    muted: hslVar(
      '--muted-foreground',
      dark ? 'hsl(215, 20%, 65%)' : 'hsl(215, 16%, 47%)',
    ),
  };
}

// ==================== 颜色工具 ====================
function withAlpha(color: string, alpha: number): string {
  // #rrggbb → rgba()
  if (color.startsWith('#') && color.length === 7) {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

// ==================== 状态 ====================
let hoverNode: any = null;
let hoverNeighborIds = new Set<string>();

const NODE_REL_SIZE = 4;
const DEFAULT_VAL = 8;

const nodeRadius = (n: any) =>
  Math.sqrt(Math.max(n.val ?? DEFAULT_VAL, 1)) * NODE_REL_SIZE;
const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v);

const isLinkDimmed = (link: any): boolean => {
  if (
    props.highlightRelationType &&
    link.relationType !== props.highlightRelationType
  ) {
    return true;
  }
  if (hoverNode) {
    const sid = idOf(link.source);
    const tid = idOf(link.target);
    return sid !== hoverNode.id && tid !== hoverNode.id;
  }
  return false;
};

const isNodeDimmed = (node: any): boolean => {
  if (!hoverNode) return false;
  return node.id !== hoverNode.id && !hoverNeighborIds.has(node.id);
};

/**
 * 触发画布重绘。
 * force-graph 停止冷却后不会自动重绘，reheat 一下让引擎转几帧即可
 * （节点已用 fx/fy 固定，不会产生位移）。
 */
function repaint() {
  try {
    instance?.d3ReheatSimulation?.();
  } catch {
    // 忽略重绘失败
  }
}

function updateHoverNeighbors() {
  hoverNeighborIds = new Set<string>();
  if (!hoverNode) return;
  for (const link of props.graphData.links) {
    const sid = idOf(link.source);
    const tid = idOf(link.target);
    if (sid === hoverNode.id) hoverNeighborIds.add(tid);
    if (tid === hoverNode.id) hoverNeighborIds.add(sid);
  }
}

// ==================== 头像加载 ====================
async function loadNodeAvatar(node: GraphNode) {
  if (!node.avatar || node.__avatarImg) return;
  let url = node.avatar;
  // 非 URL 形式则按文件 ID 走鉴权预览
  if (!/^(?:blob:|data:|https?:|\/)/.test(url)) {
    try {
      url = await fetchAuthImageUrl(node.avatar);
    } catch {
      return;
    }
  }
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    node.__avatarImg = img;
    repaint();
  };
  img.src = url;
}

function loadAllAvatars(nodes: GraphNode[]) {
  for (const n of nodes) loadNodeAvatar(n);
}

// ==================== 画布绘制 ====================
const FONT_FAMILY =
  '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

function paintNode(
  node: any,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
) {
  const r = nodeRadius(node);
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const dimmed = isNodeDimmed(node);
  const color = getCategoryColor(node.category);

  ctx.save();
  if (dimmed) ctx.globalAlpha = 0.15;

  // 中心节点光环
  if (node.isCenter) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, 2 * Math.PI, false);
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.lineWidth = 2.5;
    ctx.shadowColor = withAlpha(color, 0.8);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, r + 11, 0, 2 * Math.PI, false);
    ctx.strokeStyle = withAlpha(color, 0.18);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (node.__avatarImg) {
    // 圆形头像
    const img = node.__avatarImg as HTMLImageElement;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.clip();
    const side = Math.min(img.width, img.height);
    ctx.drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      x - r,
      y - r,
      r * 2,
      r * 2,
    );
    ctx.restore();
    // 描边
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // 分类色圆点 + 首字符
    ctx.save();
    ctx.shadowColor = withAlpha(color, 0.45);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    const initial = (node[props.nodeLabel ?? 'name'] ?? '').slice(0, 1);
    if (initial && r >= 7) {
      ctx.font = `600 ${Math.max(r * 0.9, 6)}px ${FONT_FAMILY}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, x, y);
    }
  }

  // 名字标签
  const label = node[props.nodeLabel ?? 'name'] ?? '';
  if (label) {
    const fontSize = Math.max(13 / globalScale, 2.5);
    ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // 文字底衬，保证深/浅色背景下都可读
    const textY = y + r + fontSize * 0.45;
    const metrics = ctx.measureText(label);
    ctx.save();
    ctx.globalAlpha = dimmed ? 0.15 : 0.65;
    ctx.fillStyle = theme.value.bg;
    const pad = fontSize * 0.25;
    ctx.beginPath();
    ctx.roundRect(
      x - metrics.width / 2 - pad,
      textY - pad * 0.6,
      metrics.width + pad * 2,
      fontSize + pad * 1.2,
      fontSize * 0.35,
    );
    ctx.fill();
    ctx.restore();
    if (dimmed) ctx.globalAlpha = 0.15;
    ctx.fillStyle = theme.value.label;
    ctx.fillText(label, x, textY);
  }

  ctx.restore();
}

function paintLinkLabel(link: any, ctx: CanvasRenderingContext2D) {
  if (!link.relationType) return;
  const dimmed = isLinkDimmed(link);
  const midX = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
  const midY = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2;
  const color = getRelationColor(link.relationType);

  ctx.save();
  ctx.font = `11px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(link.relationType);
  ctx.globalAlpha = dimmed ? 0.08 : 0.7;
  ctx.fillStyle = theme.value.bg;
  ctx.beginPath();
  ctx.roundRect(
    midX - metrics.width / 2 - 3,
    midY - 17,
    metrics.width + 6,
    14,
    4,
  );
  ctx.fill();
  ctx.globalAlpha = dimmed ? 0.12 : 1;
  ctx.fillStyle = color;
  ctx.fillText(link.relationType, midX, midY - 10);
  ctx.restore();
}

// ==================== 图初始化 ====================
const initGraph = () => {
  if (!container.value) return;
  readTheme();

  instance = new (ForceGraph2D as any)(container.value);

  instance
    .backgroundColor(theme.value.bg)
    .nodeLabel((n: any) => n[props.nodeLabel ?? 'name'] ?? '')
    .nodeVal((n: any) => n.val ?? DEFAULT_VAL)
    .nodeRelSize(NODE_REL_SIZE)
    .nodeColor((n: any) => getCategoryColor(n.category))
    .linkColor((link: any) => {
      const base = getRelationColor(link.relationType);
      if (isLinkDimmed(link)) return withAlpha(base, 0.08);
      const active = hoverNode || props.highlightRelationType;
      return withAlpha(base, active ? 0.95 : 0.55);
    })
    .linkWidth((link: any) => {
      if (isLinkDimmed(link)) return 0.8;
      return hoverNode || props.highlightRelationType ? 2.2 : 1.4;
    })
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .linkDirectionalArrowColor((link: any) => {
      const base = getRelationColor(link.relationType);
      return isLinkDimmed(link) ? withAlpha(base, 0.08) : withAlpha(base, 0.9);
    })
    .enablePointerInteraction(true)
    .onNodeClick((node: any) => emit('node-click', node))
    .onNodeHover((node: any) => {
      hoverNode = node ?? null;
      updateHoverNeighbors();
      if (container.value) {
        container.value.style.cursor = node ? 'pointer' : 'default';
      }
      repaint();
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject(paintNode)
    .linkCanvasObjectMode(() => 'after')
    .linkCanvasObject(paintLinkLabel)
    .nodePointerAreaPaint((node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const r = nodeRadius(node) + 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fill();
    });

  instance.d3Force('charge').strength(-260);
  instance.d3Force('link').distance(80);
  instance
    .cooldownTicks(30)
    .cooldownTime(800)
    .d3VelocityDecay(0.6)
    .d3AlphaDecay(0.1)
    .graphData(props.graphData);

  loadAllAvatars(props.graphData.nodes);

  setTimeout(() => instance?.zoomToFit(400, 60), 600);
};

// ==================== 暴露缩放控件 ====================
defineExpose({
  zoomIn() {
    if (instance) instance.zoom(instance.zoom() * 1.35, 250);
  },
  zoomOut() {
    if (instance) instance.zoom(instance.zoom() / 1.35, 250);
  },
  zoomToFit() {
    instance?.zoomToFit(400, 60);
  },
});

// ==================== 生命周期 ====================
onMounted(() => {
  initGraph();
  // 监听暗色模式切换，重读主题色并重绘
  themeObserver = new MutationObserver(() => {
    readTheme();
    instance?.backgroundColor(theme.value.bg);
    repaint();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

watch(
  () => props.graphData,
  (val) => {
    instance?.graphData(val);
    loadAllAvatars(val.nodes);
  },
  { deep: true },
);

watch(
  () => props.highlightRelationType,
  () => repaint(),
);

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
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
