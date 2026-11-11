<script setup lang="ts">
import type {
  QueryDataset,
  QueryDatasetSummary,
  QueryField,
} from '#/api/core/data-query';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import { Alert, Button, Empty, Input, Spin, Table, Tag } from 'ant-design-vue';

import {
  describeQueryDataset,
  listQueryDatasets,
  queryErrorText,
} from '#/api/core/data-query';

import FieldInfo from '../components/FieldInfo.vue';
import ModelGraph from '../components/ModelGraph.vue';

const route = useRoute();
const router = useRouter();
const models = ref<QueryDataset[]>([]);
const catalog = ref<QueryDatasetSummary[]>([]);
const loading = ref(false);
const errorText = ref('');
const failedNames = ref<string[]>([]);
const search = ref('');
const fieldSearch = ref('');
const view = ref('graph');
const tab = ref('fields');
const activeField = ref('');
const selectedName = ref('');
const detail = computed(() => route.query.detail === '1');
const selected = computed(
  () =>
    models.value.find(
      (model) => model.name === (route.query.dataset || selectedName.value),
    ) || models.value[0],
);
watch(selected, (model, previous) => {
  if (model?.name === previous?.name && model?.fields[activeField.value])
    return;
  activeField.value = model
    ? Object.entries(model.fields).find(
        ([, field]) => field.aggregateFunctions.length,
      )?.[0] ||
      Object.keys(model.fields)[0] ||
      ''
    : '';
});
const selectedField = computed<QueryField | undefined>(
  () => selected.value?.fields[activeField.value],
);
const filteredModels = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return models.value.filter((model) =>
    `${model.title} ${model.name} ${model.description} ${Object.entries(
      model.fields,
    )
      .map(([name, field]) => `${name} ${field.label}`)
      .join(' ')} ${Object.keys(model.relations).join(' ')}`
      .toLowerCase()
      .includes(keyword),
  );
});
const relationCount = computed(() =>
  models.value.reduce(
    (count, model) => count + Object.keys(model.relations).length,
    0,
  ),
);
const fields = computed(() =>
  Object.entries(selected.value?.fields || {})
    .map(([name, field]) => ({ name, ...field }))
    .filter((field) =>
      `${field.name} ${field.label}`
        .toLowerCase()
        .includes(fieldSearch.value.toLowerCase()),
    ),
);
const columns = [
  { title: '字段', key: 'name', dataIndex: 'name', width: 200 },
  { title: '类型', key: 'type', dataIndex: 'graphqlType', width: 110 },
  { title: '含义', key: 'label', dataIndex: 'label', width: 150 },
  { title: '可空', key: 'nullable', dataIndex: 'nullable', width: 65 },
  { title: '查询能力', key: 'capabilities', width: 220 },
];
const listColumns = [
  { title: '数据集', key: 'title', dataIndex: 'title', width: 140 },
  { title: '模型', key: 'name', dataIndex: 'name', width: 180 },
  { title: '说明', key: 'description', dataIndex: 'description', width: 340 },
  { title: '关联', key: 'relations', width: 160 },
  { title: '', key: 'action', width: 100 },
];

async function loadModels() {
  if (loading.value) return;
  loading.value = true;
  errorText.value = '';
  failedNames.value = [];
  try {
    catalog.value = await listQueryDatasets();
    const details: QueryDataset[] = [];
    // 限制模型描述请求并发；每个描述仍由网关重新鉴权。
    const queue = [...catalog.value];
    await Promise.all(
      [0, 1].map(async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          try {
            details.push(await describeQueryDataset(item.name));
          } catch {
            failedNames.value.push(item.title);
          }
        }
      }),
    );
    models.value = details.sort(
      (a, b) =>
        catalog.value.findIndex((item) => item.name === a.name) -
        catalog.value.findIndex((item) => item.name === b.name),
    );
  } catch (error) {
    errorText.value = queryErrorText(error);
  } finally {
    loading.value = false;
  }
}
onMounted(loadModels);

function selectModel(name: string) {
  selectedName.value = name;
  void router.replace({ query: { ...route.query, dataset: name } });
}
function openDetail(name: string) {
  if (selected.value?.name !== name) activeField.value = '';
  tab.value = 'fields';
  fieldSearch.value = '';
  void router.push({ query: { dataset: name, detail: '1' } });
}
function openWorkbench(field?: string) {
  if (!selected.value) return;
  void router.push({
    path: '/query/workbench',
    query: { dataset: selected.value.name, ...(field ? { field } : {}) },
  });
}
function fieldRow(record: { name: string }) {
  return {
    onClick: () => {
      activeField.value = record.name;
    },
    class: activeField.value === record.name ? 'selected-field-row' : '',
  };
}
</script>

<template>
  <div class="data-query-page">
    <header class="query-page-heading">
      <div class="flex min-w-0 flex-wrap items-center gap-3">
        <Button
          v-if="detail"
          type="text"
          aria-label="返回模型总览"
          @click="router.push({ query: { dataset: selected?.name } })"
        >
          <ArrowLeftOutlined />
        </Button>

        <h1>{{ detail && selected ? selected.title : '数据模型' }}</h1>
        <code v-if="detail && selected" class="text-muted-foreground">{{
          selected.name
        }}</code
        ><Tag v-if="detail && selected">{{ selected.releaseId }}</Tag>
      </div>
      <div class="flex gap-2">
        <Button
          v-if="detail && selected"
          type="primary"
          @click="openWorkbench()"
        >
          <span>在工作台查询</span>
        </Button>

        <Button aria-label="刷新模型" :loading="loading" @click="loadModels">
          <ReloadOutlined />
        </Button>
      </div>
    </header>
    <Alert
      v-if="errorText"
      type="error"
      show-icon
      :message="errorText"
      class="mb-4"
    >
      <template #action>
        <Button @click="loadModels">
          <span>重试</span>
        </Button>
      </template>
    </Alert>
    <Alert
      v-if="failedNames.length > 0"
      type="warning"
      show-icon
      :message="`部分模型未能加载：${failedNames.join('、')}`"
      class="mb-4"
    >
      <template #action>
        <Button @click="loadModels">
          <span>重试</span>
        </Button>
      </template>
    </Alert>
    <Spin :spinning="loading">
      <div v-if="models.length === 0" class="model-empty">
        <Empty
          v-if="!loading"
          :description="
            errorText || failedNames.length > 0
              ? '模型加载失败'
              : '暂无可用数据集'
          "
        />
      </div>
      <template v-else-if="!detail">
        <div class="query-toolbar">
          <Input
            v-model:value="search"
            aria-label="搜索模型"
            placeholder="搜索数据集或字段"
            allow-clear
            class="model-search"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <div class="view-switch">
            <button
              :class="{ 'is-active': view === 'graph' }"
              @click="view = 'graph'"
            >
              <span>关系图</span>
            </button>

            <button
              :class="{ 'is-active': view === 'list' }"
              @click="view = 'list'"
            >
              <span>列表</span>
            </button>
          </div>
          <span class="ml-auto text-sm text-muted-foreground"
            >{{ models.length }} 个数据集 · {{ relationCount }} 个关联</span
          >
        </div>
        <div class="models-overview">
          <div class="query-panel">
            <Empty
              v-if="filteredModels.length === 0"
              description="没有匹配的模型"
              class="my-24"
            /><ModelGraph
              v-else-if="view === 'graph'"
              :models="filteredModels"
              :selected="selected?.name || ''"
              @select="selectModel"
              @detail="openDetail"
            /><Table
              v-else
              :columns="listColumns"
              :data-source="filteredModels"
              row-key="name"
              :pagination="false"
              size="middle"
              :scroll="{ x: 'max-content' }"
            >
              <template #bodyCell="{ column, record }">
                <Button
                  v-if="column.key === 'title'"
                  type="link"
                  @click="selectModel(record.name)"
                >
                  <span>{{ record.title }}</span>
                </Button>

                <span v-else-if="column.key === 'relations'">{{
                  Object.keys(record.relations).join('、') || '—'
                }}</span
                ><Button
                  v-else-if="column.key === 'action'"
                  type="link"
                  @click="openDetail(record.name)"
                >
                  <span>查看详情</span>
                </Button>
              </template>
            </Table>
          </div>
          <aside v-if="selected" class="query-panel model-summary">
            <h2>{{ selected.title }}</h2>
            <code class="text-muted-foreground">{{ selected.name }}</code>
            <dl>
              <dt>发布版本</dt>
              <dd>{{ selected.releaseId }}</dd>
              <dt>模型描述</dt>
              <dd>{{ selected.description }}</dd>
              <dt>查询入口</dt>
              <dd>
                <Tag>{{ selected.root }}</Tag
                ><Tag>{{ selected.statsRoot }}</Tag>
              </dd>
              <dt>日期范围字段</dt>
              <dd>
                <Tag v-for="name in selected.rangeFields" :key="name">
                  {{ name }}
                </Tag>
              </dd>
              <dt>已开放关联</dt>
              <dd>
                <div
                  v-for="[name, relation] in Object.entries(selected.relations)"
                  :key="name"
                  class="mb-2 break-words"
                >
                  <code>{{ name }}</code> → {{ relation.typeName }}
                </div>
                <span v-if="Object.keys(selected.relations).length === 0"
                  >无</span
                >
              </dd>
            </dl>
            <div class="flex flex-wrap gap-2">
              <Button type="primary" @click="openDetail(selected.name)">
                <span>查看模型详情</span>
              </Button>

              <Button @click="openWorkbench()">
                <span>新建查询</span>
              </Button>
            </div>
          </aside>
        </div>
        <div class="mt-3 text-xs text-muted-foreground">
          仅展示当前有权限的逻辑模型及已开放关联
        </div>
      </template>
      <template v-else-if="selected">
        <p class="mb-5 text-sm leading-6 text-muted-foreground">
          {{ selected.description }}
        </p>
        <div class="model-tabs">
          <button
            v-for="item in [
              { key: 'fields', label: '字段' },
              { key: 'relations', label: '关联' },
              { key: 'capabilities', label: '查询能力' },
              { key: 'sdl', label: 'SDL' },
            ]"
            :key="item.key"
            :class="{ 'is-active': tab === item.key }"
            @click="tab = item.key"
          >
            <span>{{ item.label }}</span>
          </button>
        </div>
        <div class="model-roots">
          <span
            >明细 <code>{{ selected.root }}</code></span
          ><span
            >汇总 <code>{{ selected.statsRoot }}</code></span
          >
        </div>
        <div v-if="tab === 'fields'" class="model-fields-layout">
          <section class="query-panel">
            <div class="p-4">
              <Input
                v-model:value="fieldSearch"
                aria-label="搜索模型字段"
                placeholder="搜索字段"
                allow-clear
                class="model-search"
              >
                <template #prefix><SearchOutlined /></template>
              </Input>
            </div>
            <Table
              :columns="columns"
              :data-source="fields"
              row-key="name"
              :pagination="false"
              size="small"
              :scroll="{ x: 745 }"
              :custom-row="fieldRow"
            >
              <template #bodyCell="{ column, record }">
                <button
                  v-if="column.key === 'name'"
                  class="field-link"
                  @click="activeField = record.name"
                >
                  <span>{{ record.name }}</span>
                </button>

                <span v-else-if="column.key === 'label'"
                  >{{ record.label
                  }}<span v-if="record.unit" class="text-muted-foreground"
                    >（{{ record.unit }}）</span
                  ></span
                ><span v-else-if="column.key === 'nullable'">{{
                  record.nullable ? '是' : '否'
                }}</span
                ><template v-else-if="column.key === 'capabilities'">
                  <Tag v-if="record.filterOperators.length > 0">筛选</Tag
                  ><Tag v-if="record.sortable">排序</Tag
                  ><Tag v-if="record.aggregateFunctions.length > 0">汇总</Tag
                  ><Tag v-if="record.distinctFunctions.length > 0"> 去重 </Tag>
                </template>
              </template>
            </Table>
          </section>
          <aside class="query-panel self-start">
            <FieldInfo :name="activeField" :field="selectedField">
              <Button
                v-if="selectedField"
                type="link"
                class="mt-4 !px-0"
                @click="openWorkbench(activeField)"
              >
                添加到查询 <ArrowRightOutlined />
              </Button>
            </FieldInfo>
          </aside>
        </div>
        <div v-else-if="tab === 'relations'" class="space-y-4">
          <Empty
            v-if="Object.keys(selected.relations).length === 0"
            description="该模型没有开放关联"
          />
          <section
            v-for="[name, relation] in Object.entries(selected.relations)"
            :key="name"
            class="query-panel p-5"
          >
            <div class="mb-3 flex flex-wrap items-center gap-3">
              <h2 class="font-semibold">{{ relation.label }}</h2>
              <code>{{ name }} → {{ relation.typeName }}</code
              ><Tag>可空</Tag>
            </div>
            <p class="mb-4 text-sm text-muted-foreground">
              {{ relation.description }}
            </p>
            <div
              v-for="[key, field] in Object.entries(relation.fields)"
              :key="key"
              class="relation-field"
            >
              <code>{{ key }}</code
              ><span>{{ field.graphqlType }}</span
              ><span>{{ field.label }}</span
              ><span class="font-mono text-xs text-muted-foreground">{{
                field.filterOperators.join(' · ')
              }}</span
              ><Button
                type="link"
                size="small"
                @click="openWorkbench(`${name}.${key}`)"
              >
                <span>添加到查询</span>
              </Button>
            </div>
          </section>
        </div>
        <section v-else-if="tab === 'capabilities'" class="query-panel p-5">
          <h2 class="mb-4 font-semibold">查询范围与限制</h2>
          <dl class="capability-list">
            <dt>日期范围</dt>
            <dd>{{ selected.rangeSemantics }}</dd>
            <dt>明细行数</dt>
            <dd>
              默认 {{ selected.limits.defaultLimit }}，最多
              {{ selected.maxRows }}
            </dd>
            <dt>分页偏移</dt>
            <dd>最大 {{ selected.limits.maxOffset }}</dd>
            <dt>排序项</dt>
            <dd>最多 {{ selected.limits.maxOrderBy }} 项</dd>
            <dt>默认排序</dt>
            <dd>
              <code>{{ selected.defaultOrder }}</code>
            </dd>
            <dt>操作与根字段</dt>
            <dd>
              每次 {{ selected.limits.maxOperations }} 个操作、{{
                selected.limits.maxRoots
              }}
              个根字段
            </dd>
            <dt>不支持</dt>
            <dd class="flex flex-wrap gap-1">
              <Tag v-for="value in selected.unsupported" :key="value">
                {{ value }}
              </Tag>
            </dd>
          </dl>
        </section>
        <section v-else class="query-panel p-4">
          <pre class="query-json">{{ selected.graphqlSdl }}</pre>
        </section>
      </template>
    </Spin>
  </div>
</template>

<style scoped src="../query.css"></style>
<style scoped>
.model-search {
  width: 300px;
  max-width: 100%;
}
.models-overview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
}
.model-summary {
  align-self: start;
  padding: 22px;
}
.model-summary h2 {
  font-size: 20px;
  font-weight: 600;
}
.model-summary dl {
  margin: 24px 0;
}
.model-summary dt {
  margin: 20px 0 8px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
.model-summary dd {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}
.model-summary dd .ant-tag {
  margin-bottom: 5px;
}
.model-tabs {
  display: flex;
  gap: 30px;
  border-bottom: 1px solid hsl(var(--border));
}
.model-tabs button {
  padding: 10px 0 14px;
}
.model-tabs button.is-active {
  color: hsl(var(--primary));
  box-shadow: inset 0 -2px 0 hsl(var(--primary));
}
.model-roots {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  margin: 20px 0;
  padding: 12px 16px;
  background: hsl(var(--muted) / 50%);
  border-radius: 6px;
}
.model-roots code {
  margin-left: 10px;
  font-size: 12px;
  color: hsl(var(--primary));
}
.model-fields-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  align-items: start;
  gap: 16px;
}
.field-link {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  text-align: left;
}
:deep(.selected-field-row > td) {
  background: hsl(var(--primary) / 8%) !important;
}
.relation-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 10px 0;
  border-top: 1px solid hsl(var(--border));
}
.relation-field > code {
  min-width: 80px;
}
.capability-list {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  gap: 20px;
  font-size: 13px;
  line-height: 1.7;
}
.capability-list dt {
  color: hsl(var(--muted-foreground));
}
.model-empty {
  display: grid;
  min-height: calc(clamp(420px, 72vh, 650px) + 72px);
  place-content: center;
}
@media (max-width: 1199px) {
  .models-overview {
    grid-template-columns: minmax(0, 1fr);
  }
  .model-summary dl {
    display: grid;
    grid-template-columns: 100px minmax(0, 1fr);
    align-items: baseline;
    gap: 10px;
  }
  .model-summary dt {
    margin: 0;
  }
  .model-fields-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 767px) {
  .query-page-heading {
    align-items: flex-start;
    gap: 8px;
  }
  .query-page-heading > div:last-child {
    flex-shrink: 0;
  }
  .query-page-heading > div:first-child {
    gap: 6px;
  }
  .query-page-heading > div:first-child code {
    width: 100%;
  }
  .model-tabs {
    gap: 24px;
  }
  .capability-list {
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 14px;
  }
}
</style>
