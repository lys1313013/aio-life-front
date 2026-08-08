<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import ForceGraph2D from 'force-graph';

import { getCategoryColor, getRelationColor } from '../constants';

interface GraphLink {
  source: string;
  target: string;
  relationType?: string;
}

interface GraphPayload {
  links: GraphLink[];
  nodes: Array<{
    category?: string;
    id: string;
    name: string;
    relationshipCount?: number;
    val?: number;
  }>;
}

const props = defineProps<{
  graphData: GraphPayload;
  linkDirectionalArrowLength?: number;
  linkDirectionalArrowRelPos?: number;
  nodeLabel?: string;
  nodeVal?: number;
  selectedId?: null | string;
}>();

const emit = defineEmits<{
  (e: 'node-click', node: any): void;
}>();

const container = ref<HTMLDivElement | null>(null);
let instance: any = null;
let themeObserver: MutationObserver | null = null;

// ==================== 主题颜色（canvas 无法使用 Tailwind，手动探测语义类计算值） ====================
const theme = {
  bg: '#ffffff',
  text: '#333333',
  muted: '#999999',
};

const probeColor = (className: string, prop: 'backgroundColor' | 'color') => {
  const el = document.createElement('div');
  el.className = className;
  el.style.position = 'absolute';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  document.body.append(el);
  const value = getComputedStyle(el)[prop];
  el.remove();
  return value;
};

const refreshTheme = () => {
  theme.bg = probeColor('bg-card', 'backgroundColor') || theme.bg;
  theme.text = probeColor('text-card-foreground', 'color') || theme.text;
  theme.muted = probeColor('text-muted-foreground', 'color') || theme.muted;
  if (instance) {
    instance.backgroundColor(theme.bg);
    redraw();
  }
};

const redraw = () => {
  if (!instance) return;
  if (typeof instance.refresh === 'function') {
    instance.refresh();
  } else {
    instance.d3ReheatSimulation?.();
  }
};

// ==================== 图谱初始化 ====================
const initGraph = () => {
  if (!container.value) return;

  refreshTheme();
  instance = new (ForceGraph2D as any)(container.value);

  instance
    .backgroundColor(theme.bg)
    .nodeLabel((n: any) => n[props.nodeLabel ?? 'name'] ?? '')
    .nodeVal((n: any) => n.val ?? props.nodeVal ?? 20)
    .nodeColor((n: any) => getCategoryColor(n.category))
    .linkColor((link: any) => getRelationColor(link.relationType))
    .linkDirectionalArrowLength(props.linkDirectionalArrowLength ?? 6)
    .linkDirectionalArrowRelPos(props.linkDirectionalArrowRelPos ?? 1)
    .linkDirectionalArrowColor((link: any) =>
      getRelationColor(link.relationType),
    )
    .enablePointerInteraction(true)
    .onNodeClick((node: any) => emit('node-click', node))
    .linkCanvasObjectMode(() => 'after')
    .linkCanvasObject((link: any, ctx: CanvasRenderingContext2D) => {
      // 在连线中间显示关系类型标签
      if (!link.relationType) return;
      const midX = ((link.source.x ?? 0) + (link.target.x ?? 0)) / 2;
      const midY = ((link.source.y ?? 0) + (link.target.y ?? 0)) / 2;
      ctx.font =
        '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = getRelationColor(link.relationType);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(link.relationType, midX, midY - 10);
    })
    .nodeCanvasObjectMode(() => 'after')
    .nodeCanvasObject(
      (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node[props.nodeLabel ?? 'name'] ?? '';
        const fontSize = 14 / globalScale;
        const isSelected = props.selectedId && node.id === props.selectedId;

        // 选中高亮光环
        if (isSelected) {
          const r = (node.val ?? 20) + 5;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
          ctx.strokeStyle = '#ff7a00';
          ctx.lineWidth = 3 / globalScale + 1.5;
          ctx.stroke();
        }

        // 名字
        if (label) {
          ctx.font = `${isSelected ? 'bold' : 'normal'} ${fontSize}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
          ctx.fillStyle = isSelected ? '#ff7a00' : theme.text;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            label,
            node.x,
            node.y + (node.val ?? 20) + fontSize * 0.7,
          );
        }
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
  // 布局稳定后再适配一次（避免页面框架动画导致初始适配偏移）
  setTimeout(() => instance?.zoomToFit(400, 60), 1600);
};

// 容器尺寸变化时重新适配（用户手动缩放/平移后暂停自动适配）
let userInteracted = false;
let resizeObserver: MutationObserver | null | ResizeObserver = null;
let resizeTimer: null | ReturnType<typeof setTimeout> = null;

const handleResize = () => {
  if (!instance || !container.value) return;
  // force-graph 不会自动跟随容器尺寸，需手动同步画布宽高
  instance.width(container.value.clientWidth);
  instance.height(container.value.clientHeight);
  if (userInteracted) return;
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => instance?.zoomToFit(400, 60), 300);
};

// ==================== 对外暴露 ====================
const focusNode = (id: string) => {
  if (!instance) return;
  const node = (props.graphData.nodes as any[]).find((n) => n.id === id);
  if (!node || node.x === undefined || node.y === undefined) return;
  userInteracted = true;
  instance.centerAt(node.x, node.y, 600);
  // 窄屏（移动端）放大倍率收敛，避免节点占满整屏
  const targetZoom = (container.value?.clientWidth ?? 1024) < 640 ? 1.2 : 2;
  instance.zoom(Math.max(instance.zoom(), targetZoom), 600);
};

const zoomToFit = () => {
  instance?.zoomToFit(400, 60);
};

defineExpose({ focusNode, zoomToFit });

// ==================== 生命周期与监听 ====================
onMounted(() => {
  initGraph();
  // 监听暗色模式切换
  themeObserver = new MutationObserver(() => refreshTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  // 监听容器尺寸变化（侧边栏开合、窗口缩放）
  if (container.value) {
    container.value.addEventListener('pointerdown', () => {
      userInteracted = true;
    });
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container.value);
  }
});

watch(
  () => props.graphData,
  (val) => {
    instance?.graphData(val);
  },
  { deep: true },
);

watch(
  () => props.selectedId,
  () => redraw(),
);

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (resizeTimer) clearTimeout(resizeTimer);
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
