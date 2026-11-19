<script setup lang="ts">
import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  useId,
  watch,
} from 'vue';

import { Button, Checkbox, Select } from 'ant-design-vue';

import { mappingLabel } from './schema-options';
import { buildSchemaRing, ringNodeHeight } from './schema-ring-layout';

const props = defineProps<{
  relations: SchemaRelation[];
  selected: string;
  tables: SchemaTable[];
}>();
const emit = defineEmits<{
  inspect: [table: string];
  neighborhood: [table: string];
  select: [table: string];
}>();

const controlsId = useId();
const viewport = ref<HTMLDivElement>();
const showOwners = ref(true);
const fitted = ref(false);
const frame = reactive({ width: 0, height: 0 });
const display = reactive({ x: 0, y: 0, scale: 1 });
let observer: ResizeObserver | undefined;
let drag:
  | undefined
  | { id: number; offsetX: number; offsetY: number; x: number; y: number };

const layout = computed(() => buildSchemaRing(props.tables, props.relations));
const options = computed(() =>
  [...layout.value.nodes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ label, name }) => ({
      label: label === name ? name : `${label} · ${name}`,
      value: name,
    })),
);
const ownerCount = computed(
  () =>
    layout.value.edges.filter(
      ({ relation }) => relation.relationKind === 'owner',
    ).length,
);
const edges = computed(() =>
  layout.value.edges.filter(
    ({ relation }) => showOwners.value || relation.relationKind !== 'owner',
  ),
);
const selectedNode = computed(() =>
  layout.value.nodeByName.get(props.selected),
);
const incident = computed(() =>
  edges.value.filter(({ relation }) => touches(relation)),
);
const linked = computed(
  () =>
    new Set(
      incident.value.flatMap(({ relation }) => [
        relation.sourceTable,
        relation.targetTable,
      ]),
    ),
);
const fitScale = computed(() =>
  Math.min(
    frame.width / layout.value.width || 1,
    frame.height / layout.value.height || 1,
    1,
  ),
);
const boardStyle = computed(() => ({
  width: `${layout.value.width}px`,
  height: `${layout.value.height}px`,
  transform: `translate(${display.x}px, ${display.y}px) scale(${display.scale})`,
}));

function touches(relation: SchemaRelation) {
  return (
    props.selected === relation.sourceTable ||
    props.selected === relation.targetTable
  );
}

function bound(position: number, size: number, content: number) {
  const room = size - content * display.scale;
  return room >= 0 ? room / 2 : Math.max(room, Math.min(position, 0));
}

function position() {
  display.x = bound(display.x, frame.width, layout.value.width);
  display.y = bound(display.y, frame.height, layout.value.height);
}

function fit() {
  fitted.value = true;
  display.scale = fitScale.value;
  position();
}

function center(name: string) {
  const node = layout.value.nodeByName.get(name);
  if (!node) return;
  fitted.value = false;
  display.scale = Math.max(1, display.scale);
  display.x = frame.width / 2 - node.x * display.scale;
  display.y = frame.height / 2 - node.y * display.scale;
  position();
}

function reset() {
  fitted.value = false;
  Object.assign(display, { x: 0, y: 0, scale: 1 });
  if (selectedNode.value) center(selectedNode.value.name);
  else position();
}

function zoom(multiplier: number, x = frame.width / 2, y = frame.height / 2) {
  fitted.value = false;
  const next = Math.min(
    2.2,
    Math.max(fitScale.value, display.scale * multiplier),
  );
  display.x = x - ((x - display.x) * next) / display.scale;
  display.y = y - ((y - display.y) * next) / display.scale;
  display.scale = next;
  position();
}

function locate(value: unknown) {
  const name = typeof value === 'string' ? value : '';
  emit('select', name);
  if (name) center(name);
}

function startPan(event: PointerEvent) {
  if (event.button !== 0 || (event.target as Element).closest('button')) return;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    offsetX: display.x,
    offsetY: display.y,
  };
  viewport.value?.setPointerCapture(event.pointerId);
}

function movePan(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  display.x = drag.offsetX + event.clientX - drag.x;
  display.y = drag.offsetY + event.clientY - drag.y;
  position();
}

function wheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  const bounds = viewport.value?.getBoundingClientRect();
  if (!bounds) return;
  event.preventDefault();
  zoom(
    Math.exp(-event.deltaY / 650),
    event.clientX - bounds.left,
    event.clientY - bounds.top,
  );
}

function focusTable(event: FocusEvent) {
  const node = event.target as HTMLElement;
  const name = node.dataset.ringTable;
  if (!name || !node.matches(':focus-visible')) return;
  const bounds = viewport.value?.getBoundingClientRect();
  const rect = node.getBoundingClientRect();
  if (
    bounds &&
    (rect.left < bounds.left ||
      rect.right > bounds.right ||
      rect.top < bounds.top ||
      rect.bottom > bounds.bottom)
  )
    center(name);
}

function measure() {
  if (!viewport.value) return;
  frame.width = viewport.value.clientWidth;
  frame.height = viewport.value.clientHeight;
  if (fitted.value) fit();
  else position();
}

watch(layout, measure);
onMounted(() => {
  measure();
  reset();
  observer = new ResizeObserver(measure);
  if (viewport.value) observer.observe(viewport.value);
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <section class="ring-map bg-card" aria-label="单层环形全景图">
    <div class="ring-toolbar">
      <label :for="`${controlsId}-table`" class="sr-only">定位业务表</label>
      <Select
        :id="`${controlsId}-table`"
        :value="selectedNode?.name"
        :options="options"
        class="ring-picker"
        show-search
        allow-clear
        option-filter-prop="label"
        placeholder="定位一张表…"
        @change="locate"
      />
      <Checkbox v-model:checked="showOwners">
        显示用户关系（{{ ownerCount }}）
      </Checkbox>
      <div class="ring-controls" aria-label="缩放画布">
        <Button aria-label="缩小" @click="zoom(1 / 1.28)">−</Button>
        <Button @click="reset">原始大小</Button>
        <Button @click="fit">适应全图</Button>
        <Button aria-label="放大" @click="zoom(1.28)">＋</Button>
      </div>
    </div>

    <div
      ref="viewport"
      class="ring-viewport"
      @pointerdown="startPan"
      @pointermove="movePan"
      @lostpointercapture="drag = undefined"
      @focusin="focusTable"
      @wheel="wheel"
    >
      <div class="ring-board" :style="boardStyle">
        <div
          v-for="area in layout.areas"
          :key="`${area.x}-${area.y}`"
          class="ring-area"
          :class="[`ring-${area.tone}`]"
          :style="{
            left: `${area.x - area.radiusX}px`,
            top: `${area.y - area.radiusY}px`,
            width: `${area.radiusX * 2}px`,
            height: `${area.radiusY * 2}px`,
          }"
          aria-hidden="true"
        ></div>
        <svg
          :width="layout.width"
          :height="layout.height"
          class="ring-edges"
          aria-hidden="true"
        >
          <defs>
            <marker
              :id="`${controlsId}-arrow`"
              viewBox="0 0 6 6"
              refX="5.5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 6 3 L 0 6 Z" fill="context-stroke" />
            </marker>
          </defs>
          <path
            v-for="{ relation, d } in edges"
            :key="relation.id"
            class="ring-edge"
            :class="{
              'owner-edge': relation.relationKind === 'owner',
              'conditional-edge': relation.relationKind === 'polymorphic',
              'selected-edge': !!selected && touches(relation),
              'muted-edge': !!selected && !touches(relation),
            }"
            :d="d"
            :marker-end="`url(#${controlsId}-arrow)`"
          />
        </svg>
        <button
          v-for="node in layout.nodes"
          :key="node.name"
          type="button"
          :data-ring-table="node.name"
          class="ring-node"
          :class="[
            `ring-${node.tone}`,
            {
              'linked-node': linked.has(node.name),
              'muted-node':
                selected && node.name !== selected && !linked.has(node.name),
            },
          ]"
          :style="{
            left: `${node.x - node.width / 2}px`,
            top: `${node.y - ringNodeHeight / 2}px`,
            width: `${node.width}px`,
            height: `${ringNodeHeight}px`,
          }"
          :aria-label="
            node.label === node.name
              ? node.name
              : `${node.label} · ${node.name}`
          "
          :aria-pressed="node.name === selected"
          @click="emit('select', node.name)"
        >
          <span class="ring-node-icon" aria-hidden="true">▤</span>
          <span class="ring-node-label"
            ><strong>{{ node.label }}</strong
            ><code>{{ node.name }}</code></span
          >
        </button>
      </div>
    </div>

    <div class="ring-footer">
      <div class="ring-legend">
        <span><i></i>逻辑引用</span>
        <span><i class="conditional"></i>按类型匹配</span>
        <span><i class="owner"></i>用户归属与收发</span>
      </div>
      <span>{{ Math.round(display.scale * 100) }}% · 拖动空白处平移</span>
    </div>
  </section>

  <section
    v-if="selectedNode"
    class="ring-details bg-card"
    aria-label="选中表的关系"
  >
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2>{{ selectedNode.label }}</h2>
        <code>{{ selectedNode.name }} · {{ incident.length }} 条可见关系</code>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button size="small" @click="emit('inspect', selectedNode.name)">
          查看字段
        </Button>
        <Button size="small" @click="emit('neighborhood', selectedNode.name)">
          查看局部关系
        </Button>
        <Button size="small" @click="emit('select', '')">取消高亮</Button>
      </div>
    </header>
    <ul v-if="incident.length > 0" class="ring-incidents">
      <li v-for="{ relation } in incident" :key="relation.id">
        <strong>{{ relation.displayName }}</strong>
        <code>{{ relation.sourceTable }} → {{ relation.targetTable }}</code>
        <span class="text-muted-foreground">{{ mappingLabel(relation) }}</span>
      </li>
    </ul>
    <p v-else class="text-muted-foreground">此表在当前筛选下没有连线。</p>
  </section>
</template>

<style scoped>
.ring-map,
.ring-details {
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.ring-toolbar,
.ring-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 9px 14px;
  padding: 10px 12px;
}

.ring-toolbar {
  border-bottom: 1px solid hsl(var(--border));
}

.ring-picker {
  width: min(310px, 100%);
}

.ring-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}

.ring-viewport {
  position: relative;
  height: clamp(510px, 59vw, 760px);
  overflow: clip;
  isolation: isolate;
  background-color: #181d30;
  background-image: radial-gradient(#394464 1px, transparent 1px);
  background-size: 15px 15px;
  cursor: grab;
  touch-action: none;
}

.ring-board {
  position: absolute;
  inset: 0 auto auto 0;
  transform-origin: 0 0;
  user-select: none;
}

.ring-blue {
  --ring-tone: #a8b6ff;
}
.ring-purple {
  --ring-tone: #c8aff2;
}
.ring-rose {
  --ring-tone: #edacd4;
}
.ring-cyan {
  --ring-tone: #81d1d6;
}

.ring-area {
  position: absolute;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--ring-tone) 26%, transparent);
  border-radius: 50%;
  background: radial-gradient(
    ellipse,
    color-mix(in srgb, var(--ring-tone) 9%, transparent),
    color-mix(in srgb, var(--ring-tone) 3%, transparent)
  );
}

.ring-area::after {
  position: absolute;
  inset: 17px;
  border: 1px dashed color-mix(in srgb, var(--ring-tone) 22%, transparent);
  border-radius: 50%;
  content: '';
}

.ring-node {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--ring-tone) 28%, #394464);
  border-radius: 999px;
  color: #e8ebff;
  background: #1d2134;
  text-align: left;
  white-space: nowrap;
}

.ring-node-label {
  display: grid;
  gap: 2px;
}
.ring-node-label strong {
  font-size: 14px;
  line-height: 1.2;
}
.ring-node-label code {
  color: #b1bad8;
  font-size: 11px;
  line-height: 1.3;
}

.ring-node-icon {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border-radius: 50%;
  color: var(--ring-tone);
  background: color-mix(in srgb, var(--ring-tone) 11%, #1d2134);
}

.ring-node.linked-node,
.ring-node:is(:hover, :focus-visible) {
  border-color: #b6c1ff;
  opacity: 1;
}

.ring-node[aria-pressed='true'] {
  z-index: 2;
  border-color: #b6c1ff;
  color: #171c30;
  background: #b6c1ff;
}

.ring-node[aria-pressed='true'] code {
  color: #303b68;
}
.ring-node.muted-node:not(:hover, :focus-visible) {
  opacity: 0.48;
}

.ring-edges {
  position: absolute;
  inset: 0;
  max-width: none;
  overflow: visible;
  pointer-events: none;
}

.ring-edge {
  fill: none;
  stroke: #9faee9;
  stroke-width: 1.15;
  opacity: 0.66;
}
.ring-edge.owner-edge {
  stroke: #818fb7;
  stroke-width: 0.8;
  opacity: 0.3;
}
.ring-edge.conditional-edge {
  stroke: #d4a2e8;
  stroke-dasharray: 5 3;
}
.ring-edge.muted-edge {
  opacity: 0.1;
}
.ring-edge.selected-edge {
  stroke: #c5cdff;
  stroke-width: 2.4;
  opacity: 1;
}

.ring-footer {
  justify-content: space-between;
  border-top: 1px solid hsl(var(--border));
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.ring-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
}
.ring-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ring-legend i {
  width: 17px;
  border-top: 2px solid #9faee9;
}
.ring-legend .conditional {
  border-top: 2px dashed #c482db;
}
.ring-legend .owner {
  border-top: 1px solid #818fb7;
}

.ring-details {
  margin-top: 12px;
  padding: 12px;
}
.ring-details h2 {
  font-size: 16px;
  font-weight: 650;
}
.ring-incidents {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.ring-incidents li {
  display: grid;
  gap: 2px;
  padding: 7px 9px;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
}

@media (max-width: 760px) {
  .ring-viewport {
    height: 370px;
  }
  .ring-picker {
    width: 100%;
  }
  .ring-controls {
    margin-left: 0;
  }
}
</style>
