<script setup lang="ts">
import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';

import { computed, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { useRoute } from 'vue-router';

import {
  Alert,
  Button,
  Empty,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';

import { deleteSchemaRelation, getQuerySchema } from '#/api/core/query-schema';

import RelationEditor from './RelationEditor.vue';
import { clusterTables } from './schema-layout';
import { mappingLabel, relationKinds, tableLabel } from './schema-options';
import SchemaGraph from './SchemaGraph.vue';
import SchemaNeighborhood from './SchemaNeighborhood.vue';
import SchemaRing from './SchemaRing.vue';

import '../query.css';

const controlsId = useId();
const route = useRoute();
const tab = ref('overview');
const panorama = ref('ring');
const panoramaModes = [
  { label: '环形全景', value: 'ring' },
  { label: '星系全景', value: 'galaxy' },
];
const schema = ref('');
const tables = shallowRef<SchemaTable[]>([]);
const relations = shallowRef<SchemaRelation[]>([]);
const selection = ref('');
const tableSearch = ref('');
const tableGroup = ref<string>();
const fieldSearch = ref('');
const relationSearch = ref('');
const relationTable = ref<string>();
const busy = ref(false);
const loaded = ref(false);
const failed = ref(false);
const deleting = ref(new Set<string>());
const editor = ref<{ id: string; relation?: SchemaRelation }>();
const tabPane = Tabs.TabPane;

const relationsById = computed(
  () => new Map(relations.value.map((relation) => [relation.id, relation])),
);
const byName = computed(
  () => new Map(tables.value.map((table) => [table.name, table])),
);
const selectedTable = computed(() => byName.value.get(selection.value));
const columnCount = computed(() =>
  tables.value.reduce((count, table) => count + table.columns.length, 0),
);
const invalidCount = computed(
  () => relations.value.filter((relation) => !relation.valid).length,
);
const tableChoices = computed(() =>
  tables.value.map((table) => ({
    label: `${tableLabel(table)} · ${table.name}`,
    value: table.name,
  })),
);
const validRelations = computed(() =>
  relations.value.filter((relation) => relation.valid),
);
const groups = computed(() => {
  const clusters = clusterTables(tables.value, validRelations.value, true);
  const sizes = new Map<string, number>();
  for (const relation of validRelations.value) {
    if (relation.relationKind === 'owner') continue;
    for (const name of new Set([relation.sourceTable, relation.targetTable])) {
      sizes.set(name, (sizes.get(name) ?? 0) + 1);
    }
  }
  const grouped = clusters
    .filter((members) => members.length > 1)
    .map((members) => {
      const representative = [...members].sort(
        (a, b) =>
          (sizes.get(b) ?? 0) - (sizes.get(a) ?? 0) || a.localeCompare(b),
      )[0]!;
      const table = byName.value.get(representative)!;
      const name = tableLabel(table);
      return {
        key: representative,
        label: name === representative ? name : `${name} · ${representative}`,
        members,
      };
    });
  const others = clusters.filter((members) => members.length === 1).flat();
  if (others.length > 0)
    grouped.push({ key: '*', label: '其他业务表', members: others });
  return grouped;
});
const groupChoices = computed(() =>
  groups.value.map(({ key, label, members }) => ({
    label: `${label} · ${members.length} 张`,
    value: key,
  })),
);
const matchingTables = computed(() => {
  const keyword = tableSearch.value.trim().toLowerCase();
  const members = groups.value.find(
    (group) => group.key === tableGroup.value,
  )?.members;
  const candidates = members
    ? tables.value.filter((table) => members.includes(table.name))
    : tables.value;
  return keyword
    ? candidates.filter(
        (table) =>
          `${table.name} ${table.comment || ''}`
            .toLowerCase()
            .includes(keyword) ||
          table.columns.some((column) =>
            `${column.name} ${column.comment || ''}`
              .toLowerCase()
              .includes(keyword),
          ),
      )
    : candidates;
});
const catalogTable = computed(
  () =>
    matchingTables.value.find((table) => table.name === selection.value) ||
    matchingTables.value[0],
);
const matchingColumns = computed(() => {
  const keyword = fieldSearch.value.trim().toLowerCase();
  return (catalogTable.value?.columns || []).filter((column) =>
    `${column.name} ${column.comment || ''} ${column.dataType}`
      .toLowerCase()
      .includes(keyword),
  );
});
const nearbyRelations = computed(() =>
  relations.value.filter(
    (relation) =>
      relation.sourceTable === selection.value ||
      relation.targetTable === selection.value,
  ),
);
const matchingRelations = computed(() => {
  const keyword = relationSearch.value.trim().toLowerCase();
  return relations.value.filter(
    (relation) =>
      (!relationTable.value ||
        relationTable.value === relation.sourceTable ||
        relationTable.value === relation.targetTable) &&
      `${relation.displayName} ${relation.relationKey} ${relation.sourceTable} ${relation.targetTable} ${mappingLabel(relation)}`
        .toLowerCase()
        .includes(keyword),
  );
});
const columnHeaders = [
  { title: '字段', dataIndex: 'name', key: 'name', width: 170 },
  { title: '类型', dataIndex: 'dataType', key: 'dataType', width: 145 },
  { title: '约束', key: 'constraint', width: 108 },
  { title: '数据库注释', dataIndex: 'comment', key: 'comment' },
];
const relationHeaders = [
  { title: '关系', key: 'relation', width: 170 },
  { title: '来源 → 目标', key: 'tables' },
  { title: '字段映射', key: 'mapping' },
  { title: '基数', key: 'cardinality', dataIndex: 'cardinality', width: 95 },
  { title: '操作', key: 'action', width: 117 },
];

async function load() {
  if (busy.value) return;
  busy.value = true;
  failed.value = false;
  try {
    const snapshot = await getQuerySchema();
    schema.value = snapshot.schema;
    tables.value = snapshot.tables;
    relations.value = snapshot.relations;
    if (!byName.value.has(selection.value)) selection.value = '';
    if (
      tableGroup.value &&
      !groups.value.some((group) => group.key === tableGroup.value)
    ) {
      tableGroup.value = undefined;
    }
    if (relationTable.value && !byName.value.has(relationTable.value))
      relationTable.value = undefined;
    loaded.value = true;
  } catch {
    failed.value = true;
  } finally {
    busy.value = false;
  }
}
onMounted(load);

function selectTable(name: string) {
  selection.value = name;
  fieldSearch.value = '';
}

watch(
  () => [route.query.view, route.query.table],
  ([view, table]) => {
    if (view !== 'ring' && view !== 'galaxy') return;
    panorama.value = view;
    selectTable(
      typeof table === 'string' && (!loaded.value || byName.value.has(table))
        ? table
        : '',
    );
    tab.value = 'graph';
  },
  { immediate: true },
);

function browseTables(group?: string) {
  tableGroup.value = group;
  tableSearch.value = '';
  fieldSearch.value = '';
  tab.value = 'tables';
}

function inspectTable(name: string) {
  selectTable(name);
  browseTables();
}

function inspectNeighborhood(name: string) {
  selectTable(name);
  tab.value = 'local';
}

function showPanorama(name: string) {
  selectTable(name);
  tab.value = 'graph';
}

function browseRelations(name: string) {
  relationTable.value = name;
  relationSearch.value = '';
  tab.value = 'relations';
}

function openEditor(id?: string) {
  const relation = id === undefined ? undefined : relationsById.value.get(id);
  editor.value = relation ? { id: relation.id, relation } : { id: 'new' };
}

function saved(value: SchemaRelation) {
  relations.value = [
    ...relations.value.filter((relation) => relation.id !== value.id),
    value,
  ].sort(
    (a, b) =>
      a.sourceTable.localeCompare(b.sourceTable) ||
      a.relationKey.localeCompare(b.relationKey),
  );
  editor.value = undefined;
}

async function remove(id: string) {
  if (deleting.value.has(id)) return;
  deleting.value = new Set([id, ...deleting.value]);
  try {
    await deleteSchemaRelation(id);
    relations.value = relations.value.filter((relation) => relation.id !== id);
  } catch {
    // 请求层显示错误，列表继续保留原配置。
  } finally {
    const remaining = new Set(deleting.value);
    remaining.delete(id);
    deleting.value = remaining;
  }
}
</script>

<template>
  <div class="data-query-page schema-page">
    <header class="query-page-heading">
      <div>
        <h1>数据库关系图谱</h1>
        <p v-if="loaded && tab !== 'overview'" class="text-muted-foreground">
          {{ schema }} · {{ tables.length }} 张表 · {{ columnCount }} 个字段 ·
          {{ relations.length }} 条逻辑关系
        </p>
      </div>
      <Button
        :loading="busy"
        :disabled="!!editor || deleting.size > 0"
        @click="load"
      >
        刷新目录
      </Button>
    </header>

    <Alert
      v-if="failed"
      class="mb-3"
      type="error"
      message="无法读取数据库目录"
      show-icon
    >
      <template #action>
        <Button size="small" @click="load">重试</Button>
      </template>
    </Alert>
    <Alert
      v-if="invalidCount"
      class="mb-3"
      type="warning"
      :message="`${invalidCount} 条关系的表或字段已变更，可在关系配置中修正。`"
      show-icon
    />

    <Spin :spinning="busy">
      <div v-if="!loaded" class="schema-placeholder"></div>
      <Tabs v-else v-model:active-key="tab">
        <component :is="tabPane" key="overview" tab="总览">
          <dl class="schema-stats">
            <div class="schema-panel bg-card">
              <dt>业务表</dt>
              <dd>{{ tables.length }}</dd>
            </div>
            <div class="schema-panel bg-card">
              <dt>表字段</dt>
              <dd>{{ columnCount }}</dd>
            </div>
            <div class="schema-panel bg-card">
              <dt>逻辑关系</dt>
              <dd>{{ relations.length }}</dd>
            </div>
          </dl>
          <div class="schema-panel bg-card">
            <header class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2>按关联分组浏览</h2>
                <p class="text-sm text-muted-foreground">
                  根据已配置的关系自动分组。选择一组可查看其中的业务表。
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                <Button @click="browseTables()">浏览业务表</Button>
                <Button type="primary" @click="showPanorama('')">
                  查看全景图
                </Button>
              </div>
            </header>
            <div v-if="groups.length > 0" class="schema-groups">
              <button
                v-for="group in groups"
                :key="group.key"
                class="schema-group"
                type="button"
                @click="browseTables(group.key)"
              >
                <span>{{ group.label }}</span>
                <span class="text-muted-foreground"
                  >{{ group.members.length }} 张表</span
                >
              </button>
            </div>
            <Empty v-else description="暂无业务表" />
          </div>
        </component>

        <component :is="tabPane" key="tables" tab="业务表">
          <div class="schema-catalog">
            <section class="schema-panel bg-card">
              <Input
                v-model:value="tableSearch"
                aria-label="搜索业务表"
                placeholder="搜索表名、字段或注释"
                allow-clear
              />
              <label :for="`${controlsId}-table-group`" class="sr-only"
                >筛选关联分组</label
              >
              <Select
                :id="`${controlsId}-table-group`"
                v-model:value="tableGroup"
                :options="groupChoices"
                allow-clear
                placeholder="全部关联分组"
                @change="fieldSearch = ''"
              />
              <p class="text-sm text-muted-foreground">
                显示 {{ matchingTables.length }} / {{ tables.length }} 张表
              </p>
              <nav class="schema-table-list" aria-label="业务表列表">
                <button
                  v-for="table in matchingTables"
                  :key="table.name"
                  type="button"
                  :aria-current="table.name === catalogTable?.name"
                  @click="selectTable(table.name)"
                >
                  <span>{{ tableLabel(table) }}</span>
                  <code>{{ table.name }}</code>
                </button>
              </nav>
              <Empty
                v-if="matchingTables.length === 0"
                description="没有匹配的表"
              />
            </section>
            <section v-if="catalogTable" class="schema-panel bg-card">
              <header class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2>{{ tableLabel(catalogTable) }}</h2>
                  <code>{{ schema }}.{{ catalogTable.name }}</code>
                </div>
                <Button
                  size="small"
                  @click="inspectNeighborhood(catalogTable.name)"
                >
                  查看局部关系
                </Button>
              </header>
              <p v-if="catalogTable.comment" class="text-muted-foreground">
                {{ catalogTable.comment }}
              </p>
              <Input
                v-model:value="fieldSearch"
                aria-label="搜索字段"
                placeholder="搜索字段"
                allow-clear
              />
              <Table
                :columns="columnHeaders"
                :data-source="matchingColumns"
                row-key="name"
                :pagination="{ pageSize: 15, hideOnSinglePage: true }"
                :scroll="{ x: 565 }"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <code v-if="column.key === 'name'">{{ record.name }}</code>
                  <template v-else-if="column.key === 'constraint'">
                    <Tag v-if="record.primaryKey" color="blue">主键</Tag>
                    <span v-else>{{ record.nullable ? '可空' : '非空' }}</span>
                  </template>
                </template>
              </Table>
            </section>
          </div>
        </component>

        <component :is="tabPane" key="graph" tab="全景图">
          <div v-if="tab === 'graph'" class="schema-overview">
            <div class="schema-panorama-mode">
              <Segmented
                v-model:value="panorama"
                :options="panoramaModes"
                aria-label="全景图布局"
              />
            </div>
            <SchemaRing
              v-if="panorama === 'ring'"
              :tables="tables"
              :relations="validRelations"
              :selected="selection"
              @select="selectTable"
              @inspect="inspectTable"
              @neighborhood="inspectNeighborhood"
            />
            <template v-else>
              <div class="schema-scene">
                <SchemaGraph
                  :tables="tables"
                  :relations="relations"
                  :selected="selection"
                  @select="selectTable"
                />
                <aside
                  v-if="selectedTable"
                  class="schema-inspector bg-card"
                  aria-label="所选表详情"
                >
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2>{{ tableLabel(selectedTable) }}</h2>
                      <code>{{ selectedTable.name }}</code>
                    </div>
                    <Button
                      size="small"
                      aria-label="关闭表详情"
                      @click="selectTable('')"
                    >
                      ×
                    </Button>
                  </div>
                  <p v-if="selectedTable.comment" class="text-muted-foreground">
                    {{ selectedTable.comment }}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      size="small"
                      @click="inspectTable(selectedTable.name)"
                    >
                      查看 {{ selectedTable.columns.length }} 个字段
                    </Button>
                    <Button
                      size="small"
                      @click="inspectNeighborhood(selectedTable.name)"
                    >
                      查看局部关系
                    </Button>
                  </div>
                  <ul v-if="nearbyRelations.length > 0" class="schema-nearby">
                    <li v-for="relation in nearbyRelations" :key="relation.id">
                      <Button
                        type="link"
                        class="!p-0"
                        @click="
                          selectTable(
                            relation.sourceTable === selection
                              ? relation.targetTable
                              : relation.sourceTable,
                          )
                        "
                      >
                        {{ relation.sourceTable === selection ? '→' : '←' }}
                        {{
                          relation.sourceTable === selection
                            ? relation.targetTable
                            : relation.sourceTable
                        }}
                      </Button>
                      <div>
                        {{ relation.displayName }}
                        <code>{{ mappingLabel(relation) }}</code>
                      </div>
                    </li>
                  </ul>
                </aside>
              </div>
              <div class="schema-locate">
                <label :for="`${controlsId}-locate`" class="sr-only"
                  >定位表</label
                >
                <Select
                  :id="`${controlsId}-locate`"
                  :value="selection || undefined"
                  :options="tableChoices"
                  allow-clear
                  show-search
                  placeholder="定位业务表"
                  option-filter-prop="label"
                  @change="(value) => selectTable(String(value ?? ''))"
                />
              </div>
            </template>
          </div>
        </component>

        <component :is="tabPane" key="local" tab="局部关系">
          <SchemaNeighborhood
            v-if="tab === 'local'"
            :tables="tables"
            :relations="validRelations"
            :selected="selection"
            @select="selectTable"
            @inspect="inspectTable"
            @panorama="showPanorama"
            @configure="browseRelations"
            @edit="openEditor"
          />
        </component>

        <component :is="tabPane" key="relations" tab="关系配置">
          <section class="schema-panel bg-card">
            <div class="flex flex-wrap items-center gap-2">
              <Input
                v-model:value="relationSearch"
                class="schema-filter"
                aria-label="搜索关系"
                placeholder="搜索关系、表名或映射字段"
                allow-clear
              />
              <label :for="`${controlsId}-group`" class="sr-only"
                >按表筛选关系</label
              >
              <Select
                :id="`${controlsId}-group`"
                v-model:value="relationTable"
                class="schema-filter"
                :options="tableChoices"
                placeholder="按表筛选"
                allow-clear
                show-search
                option-filter-prop="label"
              />
              <Button type="primary" :disabled="busy" @click="openEditor()">
                新增关系
              </Button>
            </div>
            <Table
              :columns="relationHeaders"
              :data-source="matchingRelations"
              row-key="id"
              :pagination="{
                pageSize: 20,
                hideOnSinglePage: true,
                showSizeChanger: false,
              }"
              :scroll="{ x: 780 }"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'relation'">
                  <strong>{{ record.displayName }}</strong>
                  <div>
                    <Tag>{{ relationKinds[record.relationKind] }}</Tag
                    ><Tag v-if="!record.valid" color="warning">
                      {{ record.invalidReason || '关系已失效' }}
                    </Tag>
                  </div>
                </template>
                <code v-else-if="column.key === 'tables'"
                  >{{ record.sourceTable }} → {{ record.targetTable }}</code
                >
                <code v-else-if="column.key === 'mapping'">{{
                  mappingLabel(relationsById.get(record.id))
                }}</code>
                <div v-else-if="column.key === 'action'" class="flex gap-1">
                  <Button
                    type="link"
                    size="small"
                    :disabled="busy || deleting.has(record.id)"
                    @click="openEditor(record.id)"
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="删除此逻辑关系？"
                    ok-text="删除"
                    cancel-text="取消"
                    @confirm="remove(record.id)"
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      :disabled="busy"
                      :loading="deleting.has(record.id)"
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </template>
            </Table>
          </section>
        </component>
      </Tabs>
    </Spin>

    <RelationEditor
      v-if="editor"
      :key="editor.id"
      :relation="editor.relation"
      :tables="tables"
      :initial-source="relationTable || selection"
      @close="editor = undefined"
      @saved="saved"
    />
  </div>
</template>

<style scoped>
.schema-page h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.schema-panel {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 10px;
  padding: 12px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
}

.schema-stats,
.schema-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 175px), 1fr));
  gap: 10px;
}

.schema-stats {
  margin: 0 0 12px;
}

.schema-stats dt {
  color: hsl(var(--muted-foreground));
}

.schema-stats dd {
  margin: 0;
  font-size: 26px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.schema-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  overflow-wrap: anywhere;
  border: 1px solid hsl(var(--border));
  border-radius: 6px;
  text-align: left;
}

.schema-group:hover,
.schema-group:focus-visible {
  background: hsl(var(--accent));
}

.schema-placeholder {
  min-height: clamp(440px, 58vw, 740px);
}
.schema-panorama-mode {
  margin-bottom: 10px;
}

.schema-scene {
  position: relative;
  min-width: 0;
}
.schema-locate {
  display: flex;
  margin-top: 9px;
}
.schema-locate > * {
  width: min(100%, 310px);
}

.schema-inspector {
  position: absolute;
  top: 55px;
  right: 9px;
  z-index: 3;
  width: min(310px, calc(100% - 18px));
  max-height: calc(100% - 115px);
  display: grid;
  align-content: start;
  gap: 8px;
  overflow: auto;
  padding: 11px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  box-shadow: 0 8px 20px hsl(225deg 40% 5% / 32%);
}

.schema-nearby {
  margin: 0;
  padding: 0;
  list-style: none;
}
.schema-nearby li {
  padding: 4px 0;
  border-top: 1px solid hsl(var(--border));
}
.schema-panel code,
.schema-inspector code {
  overflow-wrap: anywhere;
}
.schema-catalog {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.schema-table-list {
  max-height: 590px;
  overflow: auto;
  display: grid;
}

.schema-table-list button {
  display: grid;
  gap: 1px;
  padding: 5px 8px;
  border-radius: 6px;
  text-align: left;
}

.schema-table-list button[aria-current='true'],
.schema-table-list button:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
.schema-table-list code {
  color: hsl(var(--muted-foreground));
}
.schema-filter {
  width: min(100%, 285px);
}

@media (max-width: 760px) {
  .schema-catalog {
    grid-template-columns: minmax(0, 1fr);
  }
  .schema-table-list {
    max-height: 208px;
  }
  .schema-inspector {
    position: static;
    width: 100%;
    max-height: 290px;
    margin-top: 8px;
  }
}
</style>
