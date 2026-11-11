<script setup lang="ts">
import type {
  QueryDataset,
  QueryDatasetSummary,
  QueryExecution,
  QueryField,
  QueryInput,
} from '#/api/core/data-query';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  CheckOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FormatPainterOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Input,
  message,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import { parse, print } from 'graphql';

import {
  describeQueryDataset,
  executeDataQuery,
  listQueryDatasets,
  queryErrorText,
  validateDataQuery,
} from '#/api/core/data-query';

import FieldInfo from '../components/FieldInfo.vue';
import QueryCodeEditor from '../components/QueryCodeEditor.vue';
import {
  defaultFields,
  initialDocument,
  queryVariables,
  resultTable,
  selectedDocumentFields,
  toggleDocumentField,
} from '../query-document';

const route = useRoute();
const router = useRouter();
const datasets = ref<QueryDatasetSummary[]>([]);
const selected = ref('');
const model = ref<QueryDataset>();
const catalogLoading = ref(false);
const modelLoading = ref(false);
const catalogError = ref('');
const modelError = ref('');
const search = ref('');
const query = ref('');
const variables = ref('{}');
const editorTab = ref('query');
const resultTab = ref('table');
const activeField = ref('');
const busy = ref<'' | 'execute' | 'validate'>('');
const operationError = ref('');
const validated = ref(false);
const execution = ref<QueryExecution>();
const elapsed = ref(0);
const executedInput = ref('');
let modelVersion = 0;
let actionVersion = 0;

const options = computed(() =>
  datasets.value.map((item) => ({
    label: `${item.title} ${item.name}`,
    value: item.name,
  })),
);
const fields = computed(() => {
  const preferred = model.value
    ? defaultFields(model.value).filter((path) => !path.includes('.'))
    : [];
  const names = [
    ...preferred,
    ...Object.keys(model.value?.fields || {}).filter(
      (name) => !preferred.includes(name),
    ),
  ];
  return names
    .map((name) => [name, model.value!.fields[name]!] as const)
    .filter(([name, field]) =>
      `${name} ${field.label}`
        .toLowerCase()
        .includes(search.value.toLowerCase()),
    );
});
const relations = computed(() =>
  Object.entries(model.value?.relations || {})
    .map(([name, relation]) => ({
      name,
      ...relation,
      fields: Object.entries(relation.fields).filter(([key, field]) =>
        `${name} ${relation.label} ${key} ${field.label}`
          .toLowerCase()
          .includes(search.value.toLowerCase()),
      ),
    }))
    .filter((relation) => relation.fields.length),
);
const checkedFields = computed(() =>
  model.value ? selectedDocumentFields(query.value, model.value) : [],
);
const focusedField = computed<QueryField | undefined>(() => {
  const [name, child] = activeField.value.split('.');
  return name
    ? child
      ? model.value?.relations[name]?.fields[child]
      : model.value?.fields[name]
    : undefined;
});
const tableData = computed(() => resultTable(execution.value?.result || {}));
const tableColumns = computed(() =>
  tableData.value.columns.map((key) => ({
    title: key,
    dataIndex: [key],
    key,
    ellipsis: true,
    width: 180,
  })),
);
const resultRows = computed(() =>
  tableData.value.rows.map((row, index) => ({
    ...row,
    __queryRowKey: String(index),
  })),
);
const modified = computed(
  () =>
    !!execution.value &&
    executedInput.value !== JSON.stringify([query.value, variables.value]),
);

async function loadCatalog() {
  if (catalogLoading.value) return;
  catalogLoading.value = true;
  catalogError.value = '';
  try {
    datasets.value = await listQueryDatasets();
    const requested =
      typeof route.query.dataset === 'string'
        ? route.query.dataset
        : selected.value;
    const next =
      datasets.value.find((item) => item.name === requested)?.name ||
      datasets.value[0]?.name ||
      '';
    if (selected.value === next) await loadModel();
    else selected.value = next;
  } catch (error) {
    catalogError.value = queryErrorText(error);
  } finally {
    catalogLoading.value = false;
  }
}

async function loadModel() {
  const version = ++modelVersion;
  ++actionVersion;
  busy.value = '';
  model.value = undefined;
  execution.value = undefined;
  validated.value = false;
  operationError.value = '';
  modelError.value = '';
  modelLoading.value = false;
  if (!selected.value) return;
  modelLoading.value = true;
  try {
    const detail = await describeQueryDataset(selected.value);
    if (version !== modelVersion) return;
    model.value = detail;
    const initial = initialDocument(detail);
    query.value = initial.query;
    variables.value = initial.variables;
    activeField.value =
      Object.entries(detail.fields).find(
        ([, field]) => field.aggregateFunctions.length,
      )?.[0] ||
      detail.rangeFields[0] ||
      '';
    const path = typeof route.query.field === 'string' ? route.query.field : '';
    if (path) {
      query.value = toggleDocumentField(query.value, detail, path, true);
      activeField.value = path;
    }
  } catch (error) {
    if (version === modelVersion) modelError.value = queryErrorText(error);
  } finally {
    if (version === modelVersion) modelLoading.value = false;
  }
}

watch(selected, (name) => {
  void loadModel();
  if (name && route.query.dataset !== name)
    void router.replace({ query: { dataset: name } });
});
watch(
  () => route.query.dataset,
  (name) => {
    if (
      typeof name === 'string' &&
      datasets.value.some((item) => item.name === name)
    )
      selected.value = name;
  },
);
watch([query, variables], () => {
  validated.value = false;
  operationError.value = '';
});
onMounted(loadCatalog);

function toggleField(path: string, checked: boolean) {
  if (!model.value) return;
  activeField.value = path;
  try {
    query.value = toggleDocumentField(query.value, model.value, path, checked);
  } catch (error) {
    message.warning(queryErrorText(error));
  }
}

function formatDocument() {
  try {
    if (editorTab.value === 'query') query.value = print(parse(query.value));
    else
      variables.value = JSON.stringify(
        queryVariables(variables.value),
        null,
        2,
      );
  } catch (error) {
    operationError.value = queryErrorText(error);
  }
}

async function run(action: 'execute' | 'validate') {
  if (!model.value || busy.value) return;
  let input: QueryInput;
  try {
    parse(query.value);
    input = {
      expectedRelease: model.value.releaseId,
      query: query.value,
      variables: queryVariables(variables.value),
    };
  } catch (error) {
    operationError.value = queryErrorText(error);
    return;
  }
  const version = ++actionVersion;
  const snapshot = JSON.stringify([query.value, variables.value]);
  busy.value = action;
  operationError.value = '';
  validated.value = false;
  const started = performance.now();
  try {
    if (action === 'validate') {
      await validateDataQuery(input);
      if (
        version === actionVersion &&
        snapshot === JSON.stringify([query.value, variables.value])
      )
        validated.value = true;
    } else {
      const data = await executeDataQuery(input);
      if (version !== actionVersion) return;
      execution.value = data;
      executedInput.value = snapshot;
      elapsed.value = Math.round(performance.now() - started);
    }
  } catch (error) {
    if (version === actionVersion) operationError.value = queryErrorText(error);
  } finally {
    if (version === actionVersion) busy.value = '';
  }
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(
      JSON.stringify(execution.value?.result, null, 2),
    );
    message.success('已复制');
  } catch {
    message.error('复制失败，请手动复制');
  }
}

function displayCell(value: unknown) {
  if (value === null || value === undefined) return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function showModel() {
  void router.push({
    path: '/query/models',
    query: { dataset: selected.value, detail: '1' },
  });
}
</script>

<template>
  <div
    class="data-query-page"
    @keydown.ctrl.enter.prevent="run('execute')"
    @keydown.meta.enter.prevent="run('execute')"
  >
    <header class="query-page-heading">
      <h1>查询工作台</h1>
      <Button
        aria-label="刷新数据集"
        :loading="catalogLoading"
        @click="loadCatalog"
      >
        <ReloadOutlined />
      </Button>
    </header>
    <Alert
      v-if="catalogError"
      type="error"
      show-icon
      :message="catalogError"
      class="mb-4"
    >
      <template #action>
        <Button size="small" @click="loadCatalog">
          <span>重试</span>
        </Button>
      </template>
    </Alert>
    <div class="query-toolbar">
      <Select
        v-model:value="selected"
        aria-label="数据集"
        :options="options"
        :loading="catalogLoading"
        :disabled="!!busy"
        show-search
        option-filter-prop="label"
        class="dataset-select"
      />
      <Button
        type="primary"
        aria-label="运行查询"
        :loading="busy === 'execute'"
        :disabled="!model || modelLoading || !!busy"
        @click="run('execute')"
      >
        <PlayCircleOutlined />运行查询
      </Button>

      <Button
        aria-label="验证"
        :loading="busy === 'validate'"
        :disabled="!model || !!busy"
        @click="run('validate')"
      >
        <CheckOutlined />验证
      </Button>

      <Tooltip title="格式化">
        <Button
          aria-label="格式化"
          :disabled="!model || !!busy"
          @click="formatDocument"
        >
          <FormatPainterOutlined />
        </Button>
      </Tooltip>

      <Tag v-if="validated" color="success">验证通过</Tag>
    </div>
    <Spin :spinning="modelLoading || catalogLoading">
      <div
        v-if="datasets.length === 0 && !catalogLoading && !catalogError"
        class="query-empty-panel"
      >
        <Empty description="暂无可用数据集" />
      </div>
      <div v-else-if="modelError" class="query-empty-panel">
        <Alert type="error" show-icon :message="modelError">
          <template #action>
            <Button @click="loadModel">
              <span>重试</span>
            </Button>
          </template>
        </Alert>
      </div>
      <div v-else class="workbench-grid">
        <aside class="query-panel field-explorer">
          <div class="query-panel-title">
            <strong>字段</strong
            ><Tooltip title="查看数据模型">
              <Button
                type="text"
                size="small"
                aria-label="查看数据模型"
                :disabled="!model"
                @click="showModel"
              >
                <DatabaseOutlined />
              </Button>
            </Tooltip>
          </div>
          <div class="p-3">
            <Input
              v-model:value="search"
              aria-label="搜索字段"
              placeholder="搜索字段"
              allow-clear
            >
              <template #prefix><SearchOutlined /></template>
            </Input>
          </div>
          <div class="field-list">
            <div
              v-for="[name, field] in fields"
              :key="name"
              class="field-row"
              :class="{ 'is-active': activeField === name }"
            >
              <Checkbox
                :checked="checkedFields.includes(name)"
                :disabled="!!busy"
                :aria-label="`选取 ${name}`"
                @change="toggleField(name, $event.target.checked)"
              />
              <button class="field-name" @click="activeField = name">
                <span>{{ name }}</span
                ><small>{{ field.label }}</small>
              </button>
            </div>
            <section
              v-for="relation in relations"
              :key="relation.name"
              class="relation-fields"
            >
              <div class="relation-label">
                {{ relation.name }} <span>{{ relation.label }}</span>
              </div>
              <div
                v-for="[name, field] in relation.fields"
                :key="name"
                class="field-row"
                :class="{
                  'is-active': activeField === `${relation.name}.${name}`,
                }"
              >
                <Checkbox
                  :checked="checkedFields.includes(`${relation.name}.${name}`)"
                  :disabled="!!busy"
                  :aria-label="`选取 ${relation.name}.${name}`"
                  @change="
                    toggleField(
                      `${relation.name}.${name}`,
                      $event.target.checked,
                    )
                  "
                /><button
                  class="field-name"
                  @click="activeField = `${relation.name}.${name}`"
                >
                  <span>{{ name }}</span
                  ><small>{{ field.label }}</small>
                </button>
              </div>
            </section>
            <Empty
              v-if="fields.length === 0 && relations.length === 0 && model"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="没有匹配字段"
            />
          </div>
        </aside>
        <section class="query-panel editor-panel">
          <div class="query-panel-title justify-start gap-6">
            <button
              :class="{ 'is-active': editorTab === 'query' }"
              @click="editorTab = 'query'"
            >
              <span>查询</span>
            </button>

            <button
              :class="{ 'is-active': editorTab === 'variables' }"
              @click="editorTab = 'variables'"
            >
              <span>变量</span>
            </button>

            <span
              v-if="model"
              class="ml-auto truncate text-xs text-muted-foreground"
              >{{ model.releaseId }}</span
            >
          </div>
          <QueryCodeEditor
            v-if="editorTab === 'query'"
            v-model="query"
            label="GraphQL 查询"
            :readonly="!!busy || !model"
          />
          <QueryCodeEditor
            v-else
            v-model="variables"
            label="查询变量 JSON"
            :readonly="!!busy || !model"
          />
        </section>
        <aside class="query-panel field-context">
          <div class="query-panel-title"><strong>字段说明</strong></div>
          <FieldInfo :name="activeField" :field="focusedField" />
          <div v-if="model" class="context-range">
            <span class="text-muted-foreground">查询范围</span>
            <p class="mt-2 font-mono text-sm">
              {{ model.rangeFields.join(' / ') }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              最长 {{ model.maxDateRangeDays }} 天 · 最多 {{ model.maxRows }} 条
            </p>
          </div>
        </aside>
      </div>
    </Spin>
    <Alert
      v-if="operationError"
      type="error"
      show-icon
      :message="operationError"
      class="mt-4"
    />
    <section class="query-panel result-panel mt-4">
      <div class="query-panel-title result-toolbar">
        <strong>查询结果</strong>
        <div class="view-switch">
          <button
            :class="{ 'is-active': resultTab === 'table' }"
            @click="resultTab = 'table'"
          >
            <span>表格</span>
          </button>

          <button
            :class="{ 'is-active': resultTab === 'json' }"
            @click="resultTab = 'json'"
          >
            <span>JSON</span>
          </button>
        </div>
        <span v-if="execution" class="result-meta"
          ><Tag :color="modified || operationError ? 'warning' : 'success'">{{
            modified ? '查询已修改' : operationError ? '上次成功结果' : '成功'
          }}</Tag
          >{{ execution.rowCount }} 条 · {{ elapsed }} ms</span
        ><Tooltip title="复制结果">
          <Button
            class="ml-auto"
            type="text"
            aria-label="复制结果"
            :disabled="!execution"
            @click="copyResult"
          >
            <CopyOutlined />
          </Button>
        </Tooltip>
      </div>
      <Spin :spinning="busy === 'execute'">
        <div class="result-body">
          <Empty
            v-if="!execution"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="运行查询后查看结果"
          />
          <pre v-else-if="resultTab === 'json'" class="query-json">{{
            JSON.stringify(execution.result, null, 2)
          }}</pre>
          <Table
            v-else
            :columns="tableColumns"
            :data-source="resultRows"
            row-key="__queryRowKey"
            size="small"
            :pagination="{
              pageSize: 20,
              showSizeChanger: true,
              hideOnSinglePage: true,
              showTotal: (total: number) => `本次结果 ${total} 条`,
            }"
            :scroll="{ x: 'max-content' }"
          >
            <template #bodyCell="{ text }">
              <span :title="displayCell(text)">{{ displayCell(text) }}</span>
            </template>
          </Table>
        </div>
      </Spin>
    </section>
  </div>
</template>

<style scoped src="../query.css"></style>
