<script setup lang="ts">
import type { GraphNode, Vector } from './schema-layout';

import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useId,
  watch,
} from 'vue';

import { Button, Checkbox, Select } from 'ant-design-vue';

import { arrangeSchema, randomSource } from './schema-layout';
import { tableLabel } from './schema-options';

interface ProjectedPoint {
  depth: number;
  factor: number;
  x: number;
  y: number;
}

interface Marker extends ProjectedPoint {
  color: string;
  label: string;
  name: string;
  showLabel: boolean;
  size: number;
}

type CanvasPoint = Pick<ProjectedPoint, 'x' | 'y'>;

interface FlowTiming {
  active: number;
  cycleMs: number;
  offset: number;
}

interface FlowPath {
  color: string;
  length: number;
  timing: FlowTiming;
  sample: (position: number) => CanvasPoint;
  tone: 'muted' | 'normal' | 'selected';
}

const props = defineProps<{
  relations: SchemaRelation[];
  selected: string;
  tables: SchemaTable[];
}>();
const emit = defineEmits<{ select: [table: string] }>();

const controlsId = useId();
const stage = ref<HTMLDivElement>();
const canvas = ref<HTMLCanvasElement>();
const flowCanvas = ref<HTMLCanvasElement>();
const markers = shallowRef<Marker[]>([]);
const mode = ref('3d');
const weight = ref('reduced');
const naming = ref('comment');
const owners = ref(true);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const rotate = ref(!motionPreference.matches);
const flow = ref(!motionPreference.matches);
const dragMode = ref('rotate');

const camera = { panX: 0, panY: 0, pitch: 0.62, yaw: -0.38, zoom: 1 };
let drag: undefined | { id: number; pan: boolean; x: number; y: number };
let resize: ResizeObserver | undefined;
let frame = 0;
let previous = 0;
let flowTime = 0;
let sceneDirty = true;
let flowPaths: FlowPath[] = [];

const validRelations = computed(() =>
  props.relations.filter((relation) => relation.valid),
);
const visibleRelations = computed(() =>
  validRelations.value.filter(
    (relation) => owners.value || relation.relationKind !== 'owner',
  ),
);
const layout = computed(() =>
  arrangeSchema(
    props.tables,
    validRelations.value,
    weight.value === 'reduced',
    mode.value === '3d',
  ),
);
const flowTimings = computed(() => {
  const nodes = new Map(layout.value.map((node) => [node.table.name, node]));
  const timings = new Map<string, FlowTiming>();
  for (const relation of validRelations.value) {
    const from = nodes.get(relation.sourceTable);
    const to = nodes.get(relation.targetTable);
    if (!from || !to) continue;
    const owner = relation.relationKind === 'owner';
    const distance =
      from === to
        ? 0.19
        : Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
    const phase = [...relation.id].reduce(
      (hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0,
      17,
    );
    // Derive timing from the 3D layout so camera motion cannot advance the pulse.
    timings.set(relation.id, {
      active: owner ? 0.54 : 0.78,
      cycleMs: 1650 + Math.min(2100, distance * 1350) + (owner ? 1350 : 0),
      offset: ((Math.imul(phase, 2_654_435_761) >>> 0) % 1000) / 1000,
    });
  }
  return timings;
});
const clouds = computed(() =>
  layout.value.map((node) => {
    const seed = [...node.table.name].reduce(
      (sum, char) => Math.imul(sum, 31) + char.charCodeAt(0),
      724,
    );
    const random = randomSource(seed);
    const radius = 0.048 + Math.min(0.064, Math.sqrt(node.degree) * 0.018);
    const dots = Array.from(
      { length: Math.min(94, 15 + Math.ceil(node.degree * 12)) },
      () => {
        const angle = random() * Math.PI * 2;
        const distance = radius * random() ** 0.62;
        return {
          alpha: 0.24 + random() * 0.43,
          size: 0.52 + random(),
          x: node.x + Math.cos(angle) * distance,
          y: node.y + Math.sin(angle) * distance,
          z: node.z + (mode.value === '3d' ? (random() - 0.5) * distance : 0),
        };
      },
    );
    return { dots, node };
  }),
);
const neighbors = computed(() => {
  const names = new Set([props.selected]);
  for (const relation of visibleRelations.value) {
    if (
      relation.sourceTable === props.selected ||
      relation.targetTable === props.selected
    ) {
      names.add(relation.sourceTable);
      names.add(relation.targetTable);
    }
  }
  return names;
});

function makeProjection(width: number, height: number) {
  const space = mode.value === '3d';
  const sine = space ? Math.sin(camera.yaw) : 0;
  const cosine = space ? Math.cos(camera.yaw) : 1;
  const tilt = space ? Math.sin(camera.pitch) : 1;
  const lift = space ? Math.cos(camera.pitch) : 0;
  const scale = (Math.min(width, height) / 2.24) * camera.zoom;
  return (node: Vector): ProjectedPoint => {
    const side = node.x * cosine - node.y * sine;
    const ahead = node.x * sine + node.y * cosine;
    const depth = ahead * lift + node.z * tilt;
    const factor = space ? 4.6 / (4.6 - depth) : 1;
    return {
      depth,
      factor,
      x: width / 2 + camera.panX + side * scale * factor,
      y:
        height / 2 +
        camera.panY +
        (ahead * tilt - node.z * lift) * scale * factor,
    };
  };
}

function shouldRotate() {
  return (
    mode.value === '3d' &&
    rotate.value &&
    !drag &&
    !props.selected &&
    !document.hidden
  );
}

function queueFrame() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function refresh() {
  sceneDirty = true;
  queueFrame();
}

function canvasContext(
  surface: HTMLCanvasElement | undefined,
  width: number,
  height: number,
  dpi: number,
) {
  const context = surface?.getContext('2d');
  if (!surface || !context) return;
  const pixelWidth = Math.round(width * dpi);
  const pixelHeight = Math.round(height * dpi);
  if (surface.width !== pixelWidth || surface.height !== pixelHeight) {
    surface.width = pixelWidth;
    surface.height = pixelHeight;
  }
  context.setTransform(dpi, 0, 0, dpi, 0, 0);
  context.clearRect(0, 0, width, height);
  return context;
}

function draw(time: number) {
  frame = 0;
  const width = stage.value?.clientWidth ?? 0;
  const height = stage.value?.clientHeight ?? 0;
  if (!width || !height) return;

  const spinning = shouldRotate();
  const flowing = mode.value === '3d' && flow.value && !document.hidden;
  if ((spinning || flowing) && previous && time - previous < 30) {
    queueFrame();
    return;
  }
  const delta = previous ? time - previous : 0;
  previous = spinning || flowing ? time : 0;
  if (spinning) camera.yaw += Math.min(60, delta) * 0.000_23;
  if (flowing) flowTime += delta;

  const dpi = Math.min(2, window.devicePixelRatio || 1);
  if (sceneDirty || spinning) {
    sceneDirty = false;
    const context = canvasContext(canvas.value, width, height, dpi);
    if (context) drawScene(context, width, height);
  }
  if (flowing) {
    const context = canvasContext(flowCanvas.value, width, height, dpi);
    if (context) drawFlow(context);
  }
  if (spinning || (flowing && flowPaths.length > 0)) queueFrame();
}

function quadraticPoint(
  start: CanvasPoint,
  bend: CanvasPoint,
  end: CanvasPoint,
  position: number,
): CanvasPoint {
  const remaining = 1 - position;
  return {
    x:
      remaining ** 2 * start.x +
      2 * remaining * position * bend.x +
      position ** 2 * end.x,
    y:
      remaining ** 2 * start.y +
      2 * remaining * position * bend.y +
      position ** 2 * end.y,
  };
}

function drawScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  flowPaths = [];
  const project = makeProjection(width, height);
  const positions = new Map(
    layout.value.map((node) => [
      node.table.name,
      { node, point: project(node) },
    ]),
  );
  for (const relation of visibleRelations.value) {
    const from = positions.get(relation.sourceTable);
    const to = positions.get(relation.targetTable);
    if (!from || !to) continue;
    const selected =
      props.selected === relation.sourceTable ||
      props.selected === relation.targetTable;
    context.globalAlpha = selected
      ? 0.95
      : props.selected
        ? 0.08
        : relation.relationKind === 'owner'
          ? 0.2
          : 0.46;
    const owner = relation.relationKind === 'owner';
    const color = selected ? '#decaff' : from.node.color;
    const timing =
      flow.value && mode.value === '3d' && (selected || !props.selected)
        ? flowTimings.value.get(relation.id)
        : undefined;
    // Use the same projected curve for the base stroke and the moving light.
    const tone = selected ? 'selected' : owner ? 'muted' : 'normal';
    context.strokeStyle = color;
    context.lineWidth = selected ? 1.8 : 0.85;
    context.setLineDash(relation.relationKind === 'polymorphic' ? [4, 3] : []);
    context.beginPath();
    const start = from.point;
    const end = to.point;
    if (from === to) {
      const x = start.x + 7;
      const y = start.y - 6;
      const angle = -0.55;
      const sweep = Math.PI * 1.92;
      context.ellipse(x, y, 10, 7, angle, 0, sweep);
      if (timing) {
        flowPaths.push({
          color,
          length: 51,
          timing,
          tone,
          sample(position) {
            const dx = 10 * Math.cos(sweep * position);
            const dy = 7 * Math.sin(sweep * position);
            return {
              x: x + dx * Math.cos(angle) - dy * Math.sin(angle),
              y: y + dx * Math.sin(angle) + dy * Math.cos(angle),
            };
          },
        });
      }
    } else {
      const curve = owner ? 0.022 : 0.061;
      const bend = project({
        x: (from.node.x + to.node.x) / 2,
        y: (from.node.y + to.node.y) / 2 - (mode.value === '2d' ? curve : 0),
        z: (from.node.z + to.node.z) / 2 + curve,
      });
      context.moveTo(start.x, start.y);
      context.quadraticCurveTo(bend.x, bend.y, end.x, end.y);
      if (timing) {
        flowPaths.push({
          color,
          length: Math.max(24, Math.hypot(end.x - start.x, end.y - start.y)),
          timing,
          tone,
          sample: (position) => quadraticPoint(start, bend, end, position),
        });
      }
    }
    context.stroke();
  }
  context.setLineDash([]);
  for (const { dots, node } of clouds.value) {
    context.fillStyle = node.color;
    const highlight = !props.selected || neighbors.value.has(node.table.name);
    for (const dot of dots) {
      const { x, y, factor } = project(dot);
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const size = dot.size * Math.min(1.8, factor * Math.sqrt(camera.zoom));
      context.globalAlpha = highlight ? dot.alpha : dot.alpha * 0.25;
      context.fillRect(x, y, size, size);
    }
  }
  context.globalAlpha = 1;

  const used: Array<{ left: number; top: number; width: number }> = [];
  const next: Marker[] = [];
  const ordered = [...positions.values()].sort(
    (a, b) => rank(b.node) - rank(a.node),
  );
  for (const { node, point } of ordered) {
    if (
      point.x < -16 ||
      point.y < -16 ||
      point.x > width + 16 ||
      point.y > height + 16
    )
      continue;
    const name = node.table.name;
    const label = naming.value === 'physical' ? name : tableLabel(node.table);
    const size = Math.max(
      5,
      Math.min(17, (5 + 2.1 * Math.sqrt(node.degree)) * point.factor),
    );
    const labelWidth = Math.min(
      146,
      [...label].reduce(
        (sum, character) => sum + (character.charCodeAt(0) > 255 ? 11 : 6),
        6,
      ),
    );
    const left = point.x - labelWidth / 2;
    const top = point.y - 26;
    const showLabel =
      name === props.selected ||
      ((!props.selected || neighbors.value.has(name)) &&
        left > 4 &&
        left + labelWidth < width - 4 &&
        top > 4 &&
        point.y < height - 6 &&
        (width >= 440 || node.degree > 2 || camera.zoom > 1.35) &&
        used.every(
          (box) =>
            top + 17 < box.top ||
            box.top + 17 < top ||
            left + labelWidth + 4 < box.left ||
            box.left + box.width + 4 < left,
        ));
    if (showLabel) used.push({ left, top, width: labelWidth });
    next.push({ ...point, color: node.color, label, name, showLabel, size });
  }
  markers.value = next.sort((a, b) => a.depth - b.depth);
}

function drawFlow(context: CanvasRenderingContext2D) {
  context.lineCap = 'round';
  for (const { color, length, sample, timing, tone } of flowPaths) {
    const selected = tone === 'selected';
    const muted = tone === 'muted';
    const { active, cycleMs, offset } = timing;
    const position = ((flowTime / cycleMs + offset) % 1) / active;
    if (position >= 1) continue;

    const brightness =
      Math.min(1, position / 0.12, (1 - position) / 0.13) *
      (selected ? 1 : muted ? 0.42 : 0.78);
    const tail = Math.min(0.34, (selected ? 29 : 21) / length);
    const head = sample(position);
    let start = sample(Math.max(0, position - tail));
    context.strokeStyle = color;
    for (let segment = 1; segment <= 4; segment++) {
      const end = sample(Math.max(0, position - tail * (1 - segment / 4)));
      context.globalAlpha = brightness * (segment / 4) ** 2;
      context.lineWidth = (selected ? 2.7 : 1.9) * (0.45 + segment * 0.14);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
      start = end;
    }

    context.fillStyle = color;
    context.globalAlpha = brightness * 0.27;
    context.beginPath();
    context.arc(head.x, head.y, selected ? 4.5 : 3.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f5f5ff';
    context.globalAlpha = brightness;
    context.beginPath();
    context.arc(head.x, head.y, selected ? 1.9 : 1.3, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function rank(node: GraphNode) {
  return (
    node.degree +
    (node.table.name === props.selected
      ? 1000
      : neighbors.value.has(node.table.name)
        ? 100
        : 0)
  );
}

function resetView(view: 'default' | 'side' | 'top' = 'default') {
  camera.zoom = 1;
  camera.panX = 0;
  camera.panY = 0;
  camera.pitch = view === 'top' ? Math.PI / 2 : view === 'side' ? 0.07 : 0.62;
  camera.yaw = view === 'top' ? 0 : -0.38;
  if (view !== 'default') rotate.value = false;
  refresh();
}

function zoom(multiplier: number) {
  camera.zoom = Math.min(4, Math.max(0.65, camera.zoom * multiplier));
  refresh();
}

function locate() {
  const node = layout.value.find(({ table }) => table.name === props.selected);
  const width = stage.value?.clientWidth;
  const height = stage.value?.clientHeight;
  if (!node || !width || !height) return;
  camera.zoom = 1.68;
  camera.panX = 0;
  camera.panY = 0;
  const point = makeProjection(width, height)(node);
  camera.panX = width / 2 - point.x;
  camera.panY = height / 2 - point.y;
  refresh();
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || (event.target as HTMLElement).closest('button'))
    return;
  drag = {
    id: event.pointerId,
    pan: event.shiftKey || dragMode.value === 'pan' || mode.value === '2d',
    x: event.clientX,
    y: event.clientY,
  };
  stage.value?.setPointerCapture(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (drag.pan) {
    camera.panX += dx;
    camera.panY += dy;
  } else {
    camera.yaw += dx * 0.006;
    camera.pitch = Math.max(
      0.07,
      Math.min(Math.PI / 2, camera.pitch - dy * 0.005),
    );
  }
  refresh();
}

watch([layout, mode], () => resetView());
watch([naming, owners, rotate, flow, () => props.selected], refresh);

function handleMotionPreference(event: MediaQueryListEvent) {
  if (event.matches) {
    rotate.value = false;
    flow.value = false;
  }
}

function handleVisibilityChange() {
  previous = 0;
  refresh();
}

onMounted(() => {
  resize = new ResizeObserver(refresh);
  if (stage.value) resize.observe(stage.value);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  motionPreference.addEventListener('change', handleMotionPreference);
  refresh();
});
onUnmounted(() => {
  resize?.disconnect();
  cancelAnimationFrame(frame);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  motionPreference.removeEventListener('change', handleMotionPreference);
});
</script>

<template>
  <section class="schema-graph" aria-label="数据库关系全景图">
    <div class="graph-controls">
      <label :for="`${controlsId}-mode`" class="sr-only">视图类型</label>
      <Select
        :id="`${controlsId}-mode`"
        v-model:value="mode"
        :options="[
          { label: '3D', value: '3d' },
          { label: '2D', value: '2d' },
        ]"
      />
      <label :for="`${controlsId}-weight`" class="sr-only">关系权重</label>
      <Select
        :id="`${controlsId}-weight`"
        v-model:value="weight"
        :options="[
          { label: 'user_id 降权', value: 'reduced' },
          { label: '所有关系等权', value: 'equal' },
        ]"
      />
      <label :for="`${controlsId}-naming`" class="sr-only">节点名称</label>
      <Select
        :id="`${controlsId}-naming`"
        v-model:value="naming"
        :options="[
          { label: '数据库注释', value: 'comment' },
          { label: '物理表名', value: 'physical' },
        ]"
      />
      <Checkbox v-model:checked="owners">用户关系</Checkbox>
      <Checkbox
        v-if="mode === '3d'"
        v-model:checked="rotate"
        :disabled="!!selected"
      >
        自动旋转
      </Checkbox>
      <Checkbox v-if="mode === '3d'" v-model:checked="flow">连线流动</Checkbox>
    </div>

    <div
      ref="stage"
      class="graph-stage"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @lostpointercapture="
        drag = undefined;
        refresh();
      "
      @wheel.prevent="zoom($event.deltaY > 0 ? 0.92 : 1.08)"
    >
      <canvas ref="canvas" aria-hidden="true"></canvas>
      <canvas
        v-show="mode === '3d' && flow"
        ref="flowCanvas"
        class="graph-flow"
        aria-hidden="true"
      ></canvas>
      <button
        v-for="marker in markers"
        :key="marker.name"
        class="graph-pin"
        type="button"
        :aria-label="
          marker.name === marker.label
            ? marker.name
            : `${marker.label} · ${marker.name}`
        "
        :aria-pressed="selected === marker.name"
        :style="{
          '--pin-color': marker.color,
          '--pin-size': `${marker.size}px`,
          left: `${marker.x}px`,
          top: `${marker.y}px`,
        }"
        @click="emit('select', marker.name)"
      >
        <span :class="{ 'show-label': marker.showLabel }">{{
          marker.label
        }}</span>
      </button>
    </div>

    <div class="graph-controls graph-footer">
      <template v-if="mode === '3d'">
        <Button
          size="small"
          :type="dragMode === 'rotate' ? 'primary' : 'default'"
          @click="dragMode = 'rotate'"
        >
          旋转
        </Button>
        <Button
          size="small"
          :type="dragMode === 'pan' ? 'primary' : 'default'"
          @click="dragMode = 'pan'"
        >
          平移
        </Button>
        <Button size="small" @click="resetView('top')">俯视</Button>
        <Button size="small" @click="resetView('side')">侧视</Button>
      </template>
      <Button size="small" @click="resetView()">全图</Button>
      <Button size="small" aria-label="缩小" @click="zoom(0.8)">−</Button>
      <Button size="small" aria-label="放大" @click="zoom(1.25)">＋</Button>
      <Button v-if="selected" size="small" @click="locate">定位选中表</Button>
    </div>
  </section>
</template>

<style scoped>
.schema-graph {
  min-width: 0;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  overflow: clip;
}

.graph-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: hsl(var(--card));
}

.graph-stage {
  position: relative;
  height: clamp(385px, 54vw, 680px);
  overflow: clip;
  touch-action: none;
  cursor: grab;
  background: radial-gradient(
    ellipse at 54% 49%,
    hsl(224deg 33% 13%),
    hsl(229deg 34% 8%) 75%
  );
}

.graph-stage canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.graph-pin {
  position: absolute;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  border: 0;
  border-radius: 50%;
  color: var(--pin-color);
  background: transparent;
}

.graph-pin::before {
  width: var(--pin-size);
  height: var(--pin-size);
  border-radius: 50%;
  background: var(--pin-color);
  box-shadow: 0 0 13px var(--pin-color);
  content: '';
}

.graph-pin[aria-pressed='true'],
.graph-pin:focus-visible {
  z-index: 2;
  outline: 1px solid currentColor;
  outline-offset: -2px;
}

.graph-pin span {
  position: absolute;
  bottom: 24px;
  left: 50%;
  visibility: hidden;
  width: max-content;
  max-width: 146px;
  transform: translateX(-50%);
  overflow: hidden;
  color: hsl(224deg 56% 93%);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px hsl(224deg 70% 5%);
  white-space: nowrap;
  pointer-events: none;
}

.graph-pin .show-label,
.graph-pin:hover span,
.graph-pin:focus-visible span {
  visibility: visible;
}
</style>
