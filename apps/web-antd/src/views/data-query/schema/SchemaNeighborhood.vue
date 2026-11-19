<script setup lang="ts">
import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

import { computed, ref, useId } from 'vue';

import { Button, Checkbox, Empty, Select, Tag } from 'ant-design-vue';

import { mappingLabel, relationKinds, tableLabel } from './schema-options';

const props = defineProps<{
  relations: SchemaRelation[];
  selected: string;
  tables: SchemaTable[];
}>();

const emit = defineEmits<{
  configure: [table: string];
  edit: [relationId: string];
  inspect: [table: string];
  panorama: [table: string];
  select: [table: string];
}>();

const controlsId = useId();
const showOwners = ref(false);
const edgeId = ref('');
const tablesByName = computed(
  () => new Map(props.tables.map((table) => [table.name, table])),
);
const tableChoices = computed(() =>
  props.tables.map((table) => ({
    value: table.name,
    label:
      tableLabel(table) === table.name
        ? table.name
        : `${tableLabel(table)} · ${table.name}`,
  })),
);
const center = computed(
  () =>
    tablesByName.value.get(props.selected) ??
    tablesByName.value.get('time_record') ??
    props.tables[0],
);
const incident = computed(() =>
  props.relations.filter(
    ({ sourceTable, targetTable }) =>
      sourceTable === center.value?.name || targetTable === center.value?.name,
  ),
);
const ownerCount = computed(
  () =>
    incident.value.filter(({ relationKind }) => relationKind === 'owner')
      .length,
);
const visible = computed(() =>
  incident.value.filter(
    ({ relationKind }) => showOwners.value || relationKind !== 'owner',
  ),
);
const directions = computed(() => [
  {
    key: 'incoming',
    label: '指向中心表',
    edges: visible.value.filter(
      ({ sourceTable }) => sourceTable !== center.value?.name,
    ),
  },
  {
    key: 'outgoing',
    label: '中心表指向',
    edges: visible.value.filter(
      ({ targetTable }) => targetTable !== center.value?.name,
    ),
  },
]);
const self = computed(() =>
  visible.value.filter(
    ({ sourceTable, targetTable }) => sourceTable === targetTable,
  ),
);
const edge = computed(
  () => visible.value.find(({ id }) => id === edgeId.value) ?? visible.value[0],
);

function peer(relation: SchemaRelation) {
  return relation.sourceTable === center.value?.name
    ? relation.targetTable
    : relation.sourceTable;
}

function peerLabel(relation: SchemaRelation) {
  const table = tablesByName.value.get(peer(relation));
  return table ? tableLabel(table) : peer(relation);
}

function select(name: string) {
  edgeId.value = '';
  emit('select', name);
}

function conditionLabel(
  relation: SchemaRelation,
  condition: SchemaRelation['conditions'][number],
) {
  const table =
    condition.side === 'source' ? relation.sourceTable : relation.targetTable;
  const term = `${table}.${condition.column}`;
  if (condition.operator === 'eq')
    return `${term} = ${JSON.stringify(condition.value)}`;
  return `${term} ${condition.operator === 'isNull' ? 'IS NULL' : 'IS NOT NULL'}`;
}
</script>

<template>
  <section v-if="center" class="neighborhood" aria-label="局部关系图">
    <div class="neighborhood-toolbar">
      <label :for="`${controlsId}-center`">中心表</label>
      <Select
        :id="`${controlsId}-center`"
        :value="center.name"
        :options="tableChoices"
        class="neighborhood-select"
        show-search
        option-filter-prop="label"
        @change="(value) => select(String(value))"
      />
      <Checkbox v-model:checked="showOwners">
        显示用户归属{{ ownerCount ? `（${ownerCount}）` : '' }}
      </Checkbox>
      <Button @click="emit('panorama', center.name)">转到全景图</Button>
    </div>

    <div class="neighborhood-graph bg-card">
      <div
        class="neighborhood-center"
        :class="{
          'has-incoming': directions[0]?.edges.length,
          'has-outgoing': directions[1]?.edges.length,
        }"
      >
        <span class="incoming-arrow" aria-hidden="true">→</span>
        <span class="outgoing-arrow" aria-hidden="true">→</span>
        <strong>{{ tableLabel(center) }}</strong>
        <code>{{ center.name }}</code>
        <span class="text-muted-foreground">{{ visible.length }} 条关系</span>
        <Button size="small" @click="emit('inspect', center.name)">
          查看字段
        </Button>
      </div>

      <section
        v-for="direction in directions"
        :key="direction.key"
        :class="`neighborhood-${direction.key}`"
      >
        <h2>{{ direction.label }} · {{ direction.edges.length }}</h2>
        <div v-if="direction.edges.length > 0" class="neighborhood-edges">
          <button
            v-for="item in direction.edges"
            :key="item.id"
            class="neighborhood-edge"
            :class="{ 'edge-conditional': item.relationKind === 'polymorphic' }"
            :aria-pressed="edge?.id === item.id"
            type="button"
            @click="edgeId = item.id"
          >
            <strong>{{ peerLabel(item) }}</strong>
            <code>{{ peer(item) }}</code>
            <span>{{ item.displayName }} · {{ item.cardinality }}</span>
          </button>
        </div>
        <p v-else class="text-muted-foreground">暂无关系</p>
      </section>

      <section v-if="self.length > 0" class="neighborhood-self">
        <h2>自关联 · {{ self.length }}</h2>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="item in self"
            :key="item.id"
            :aria-pressed="edge?.id === item.id"
            :type="edge?.id === item.id ? 'primary' : 'default'"
            size="small"
            @click="edgeId = item.id"
          >
            {{ item.displayName }}
          </Button>
        </div>
      </section>
    </div>

    <section v-if="edge" class="neighborhood-detail bg-card" aria-live="polite">
      <header class="flex flex-wrap items-center gap-2">
        <h2>{{ edge.displayName }}</h2>
        <Tag>{{ relationKinds[edge.relationKind] }}</Tag>
        <code>{{ edge.cardinality }}</code>
      </header>
      <code>{{ edge.sourceTable }} → {{ edge.targetTable }}</code>
      <dl>
        <dt>字段映射</dt>
        <dd>
          <code>{{ mappingLabel(edge) }}</code>
        </dd>
        <template v-if="edge.conditions.length > 0">
          <dt>匹配条件（全部满足）</dt>
          <dd>
            <ul class="m-0 list-none p-0">
              <li v-for="(condition, index) in edge.conditions" :key="index">
                <code>{{ conditionLabel(edge, condition) }}</code>
              </li>
            </ul>
          </dd>
        </template>
        <template v-if="edge.description">
          <dt>业务说明</dt>
          <dd>{{ edge.description }}</dd>
        </template>
      </dl>
      <div class="flex flex-wrap gap-2">
        <Button size="small" @click="emit('inspect', peer(edge))">
          查看关联表字段
        </Button>
        <Button
          v-if="peer(edge) !== center.name"
          size="small"
          @click="select(peer(edge))"
        >
          以关联表为中心
        </Button>
        <Button size="small" @click="emit('edit', edge.id)">编辑此关系</Button>
      </div>
    </section>
    <Empty
      v-else
      :description="
        ownerCount && !showOwners
          ? '当前只配置了用户归属关系，可勾选显示'
          : '本表暂无逻辑关系'
      "
    />
    <div>
      <Button size="small" @click="emit('configure', center.name)">
        查看此表的关系配置
      </Button>
    </div>
  </section>
  <Empty v-else description="暂无业务表" />
</template>

<style scoped>
.neighborhood {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.neighborhood-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.neighborhood-select {
  width: min(100%, 320px);
}

.neighborhood-graph,
.neighborhood-detail {
  min-width: 0;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.neighborhood-graph {
  display: grid;
  grid-template-areas: 'incoming center outgoing' 'self self self';
  grid-template-columns: minmax(0, 1fr) minmax(140px, 0.7fr) minmax(0, 1fr);
  align-items: start;
  gap: 12px 26px;
}

.neighborhood-center {
  position: relative;
  display: grid;
  align-self: center;
  justify-items: start;
  grid-area: center;
  gap: 5px;
  min-width: 0;
  padding: 12px;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--primary) / 45%);
  border-radius: 8px;
  background: hsl(var(--primary) / 7%);
}

.incoming-arrow,
.outgoing-arrow {
  position: absolute;
  top: 50%;
  display: none;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
  font-size: 16px;
}

.incoming-arrow {
  right: calc(100% + 6px);
}

.outgoing-arrow {
  left: calc(100% + 6px);
}

@media (min-width: 701px) {
  .has-incoming .incoming-arrow,
  .has-outgoing .outgoing-arrow {
    display: block;
  }
}

.neighborhood-incoming {
  grid-area: incoming;
}

.neighborhood-outgoing {
  grid-area: outgoing;
}

.neighborhood-self {
  grid-area: self;
}

.neighborhood h2 {
  margin: 0 0 5px;
  font-size: 14px;
  font-weight: 650;
}

.neighborhood-edges {
  display: grid;
  align-content: start;
  gap: 5px;
  max-height: 340px;
  overflow: auto;
}

.neighborhood-edge {
  display: grid;
  gap: 2px;
  min-width: 0;
  padding: 7px 9px;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  text-align: left;
}

.edge-conditional {
  border-style: dashed;
}

.neighborhood-edge[aria-pressed='true'],
.neighborhood-edge:hover,
.neighborhood-edge:focus-visible {
  border-color: hsl(var(--primary) / 55%);
  background: hsl(var(--primary) / 7%);
}

.neighborhood-edge span,
.neighborhood-edge code,
.neighborhood-detail dt {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.neighborhood-detail {
  display: grid;
  gap: 8px;
  overflow-wrap: anywhere;
}

.neighborhood-detail h2 {
  margin: 0;
}

.neighborhood-detail dl {
  display: grid;
  grid-template-columns: minmax(98px, max-content) minmax(0, 1fr);
  gap: 7px 12px;
  margin: 0;
}

.neighborhood-detail dd {
  margin: 0;
}

@media (max-width: 700px) {
  .neighborhood-graph {
    grid-template-areas: 'center center' 'incoming outgoing' 'self self';
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .neighborhood-detail dl {
    grid-template-columns: minmax(0, 1fr);
    gap: 3px;
  }
}
</style>
