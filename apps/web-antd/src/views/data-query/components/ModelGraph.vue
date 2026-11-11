<script setup lang="ts">
import type { QueryDataset } from '#/api/core/data-query';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

import {
  AimOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import { Button, Tooltip } from 'ant-design-vue';

const props = defineProps<{ models: QueryDataset[]; selected: string }>();
const emit = defineEmits<{ detail: [name: string]; select: [name: string] }>();
const viewport = ref<HTMLElement>();
const zoom = ref(0.85);
const layout = computed(() => {
  const nodes: {
    fields: string[];
    id: string;
    label: string;
    model: string;
    relation: boolean;
    title: string;
    x: number;
    y: number;
  }[] = [];
  const edges: {
    label: string;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  }[] = [];
  let linkedY = 24;
  let isolatedY = 24;
  const hasRelations = props.models.some(
    (model) => Object.keys(model.relations).length,
  );
  for (const model of props.models) {
    const relations = Object.entries(model.relations);
    const y = relations.length > 0 ? linkedY : isolatedY;
    const x = relations.length > 0 || !hasRelations ? 24 : 724;
    nodes.push({
      id: model.name,
      model: model.name,
      label: model.title,
      title: model.name,
      fields: Object.keys(model.fields)
        .filter(
          (name) =>
            ![
              'categoryId',
              'createUser',
              'exerciseTypeId',
              'id',
              'incomeTypeId',
              'isDeleted',
              'updateUser',
              'userId',
            ].includes(name),
        )
        .slice(0, 3),
      x,
      y,
      relation: false,
    });
    relations.forEach(([name, relation], index) => {
      const relationY = linkedY + index * 218;
      nodes.push({
        id: `${model.name}.${name}`,
        model: model.name,
        label: relation.label,
        title: relation.typeName,
        fields: Object.keys(relation.fields),
        x: 412,
        y: relationY,
        relation: true,
      });
      edges.push({
        label: name,
        x1: x + 248,
        x2: 412,
        y1: y + 84,
        y2: relationY + 84,
      });
    });
    if (relations.length > 0) linkedY += Math.max(1, relations.length) * 218;
    else isolatedY += 218;
  }
  return {
    nodes,
    edges,
    width: hasRelations ? 1000 : 296,
    height: Math.max(linkedY, isolatedY, 400),
  };
});

function fit() {
  if (!viewport.value) return;
  zoom.value = Math.max(
    0.4,
    Math.min(1, (viewport.value.clientWidth - 28) / layout.value.width),
  );
}
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(fit);
  if (viewport.value) observer.observe(viewport.value);
  fit();
});
onBeforeUnmount(() => observer?.disconnect());
watch(
  () => props.models,
  async () => {
    await nextTick();
    fit();
  },
);
</script>

<template>
  <div class="model-graph">
    <div
      ref="viewport"
      class="graph-viewport"
      tabindex="0"
      aria-label="数据模型关系图，可滚动查看"
    >
      <div
        :style="{
          width: `${layout.width * zoom}px`,
          height: `${layout.height * zoom}px`,
        }"
      >
        <div
          class="graph-canvas"
          :style="{
            width: `${layout.width}px`,
            height: `${layout.height}px`,
            transform: `scale(${zoom})`,
          }"
        >
          <svg
            class="graph-edges"
            :width="layout.width"
            :height="layout.height"
            aria-hidden="true"
          >
            <g v-for="edge in layout.edges" :key="`${edge.label}-${edge.y1}`">
              <path
                :d="`M ${edge.x1} ${edge.y1} C ${edge.x1 + 30} ${edge.y1}, ${edge.x2 - 30} ${edge.y2}, ${edge.x2 - 5} ${edge.y2}`"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                :d="`M ${edge.x2 - 10} ${edge.y2 - 4} L ${edge.x2 - 4} ${edge.y2} L ${edge.x2 - 10} ${edge.y2 + 4}`"
                fill="none"
                stroke="currentColor"
              />
              <rect
                :x="edge.x1 + 3"
                :y="(edge.y1 + edge.y2) / 2 - 11"
                :width="Math.max(72, edge.label.length * 7.3)"
                height="22"
                rx="4"
              />
              <text :x="edge.x1 + 8" :y="(edge.y1 + edge.y2) / 2 + 4">
                {{ edge.label }}
              </text>
            </g>
          </svg>
          <section
            v-for="node in layout.nodes"
            :key="node.id"
            class="graph-node"
            :class="{
              'is-selected': selected === node.model,
              'is-relation': node.relation,
            }"
            :style="{ left: `${node.x}px`, top: `${node.y}px` }"
          >
            <button
              class="graph-node-heading"
              :aria-label="`选择${node.label}`"
              @click="emit('select', node.model)"
            >
              <strong>{{ node.label }}</strong
              ><span>{{ node.title }}</span>
            </button>

            <div class="graph-node-fields">
              <div v-for="field in node.fields" :key="field">
                <span class="field-symbol">{{ node.relation ? '↳' : '·' }}</span
                ><code>{{ field }}</code>
              </div>
            </div>
            <span v-if="node.relation" class="relation-caption">关联对象</span
            ><button
              v-else
              class="graph-node-detail"
              @click="emit('detail', node.model)"
            >
              <span>查看全部字段 ↗</span>
            </button>
          </section>
        </div>
      </div>
    </div>
    <div class="graph-controls">
      <Tooltip title="适应宽度">
        <Button size="small" aria-label="适应宽度" @click="fit">
          <AimOutlined />
        </Button>
      </Tooltip>

      <Button
        size="small"
        aria-label="缩小"
        :disabled="zoom <= 0.4"
        @click="zoom = Math.max(0.4, zoom - 0.1)"
      >
        <MinusOutlined />
      </Button>

      <span>{{ Math.round(zoom * 100) }}%</span
      ><Button
        size="small"
        aria-label="放大"
        :disabled="zoom >= 1.5"
        @click="zoom = Math.min(1.5, zoom + 0.1)"
      >
        <PlusOutlined />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.model-graph {
  position: relative;
  min-width: 0;
  background: radial-gradient(hsl(var(--border)) 1px, transparent 1px) 0 0 /
    16px 16px;
}
.graph-viewport {
  height: 650px;
  max-height: 72vh;
  min-height: 420px;
  overflow: auto;
}
.graph-canvas {
  position: relative;
  transform-origin: top left;
}
.graph-edges {
  position: absolute;
  top: 0;
  left: 0;
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}
.graph-edges rect {
  fill: hsl(var(--card));
  stroke: hsl(var(--border));
}
.graph-edges text {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  fill: hsl(var(--foreground));
}
.graph-node {
  position: absolute;
  width: 248px;
  height: 184px;
  overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 7px;
}
.graph-node.is-selected {
  border-color: hsl(var(--primary));
}
.graph-node-heading {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: hsl(var(--primary) / 8%);
  text-align: left;
}
.graph-node-heading strong {
  flex-shrink: 0;
}
.graph-node-heading span {
  overflow: hidden;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.is-relation .graph-node-heading {
  background: hsl(var(--muted) / 50%);
}
.graph-node-fields {
  padding: 9px 12px 4px;
}
.graph-node-fields > div {
  display: flex;
  align-items: center;
  gap: 10px;
  line-height: 25px;
}
.graph-node-fields code {
  font-size: 12px;
}
.field-symbol {
  color: hsl(var(--muted-foreground));
}
.graph-node-detail,
.relation-caption {
  display: block;
  padding: 5px 12px;
  font-size: 12px;
  color: hsl(var(--primary));
}
.relation-caption {
  color: hsl(var(--muted-foreground));
}
.graph-controls {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  font-size: 12px;
}
</style>
