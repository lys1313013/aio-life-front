<script setup lang="ts">
import type { SchemaRelation, SchemaTable } from '#/api/core/query-schema';
import type { SchemaRelationSaveReq } from '#/api/payload';

import { computed, reactive, ref, useId } from 'vue';

import { Alert, Button, Drawer, Form, Input, Select } from 'ant-design-vue';

import { saveSchemaRelation } from '#/api/core/query-schema';

import { multiplicities, relationKinds, tableLabel } from './schema-options';

const props = defineProps<{
  initialSource: string;
  relation?: SchemaRelation;
  tables: SchemaTable[];
}>();
const emit = defineEmits<{ close: []; saved: [relation: SchemaRelation] }>();

const fieldsId = useId();
const saved = props.relation;
const [sourceCount, targetCount] = (saved?.cardinality || 'N:0..1').split(':');
const sourceCardinality = ref(sourceCount || 'N');
const targetCardinality = ref(targetCount || '0..1');
const draft = reactive<SchemaRelationSaveReq>({
  sourceTable: saved?.sourceTable || props.initialSource,
  targetTable: saved?.targetTable || '',
  relationKey: saved?.relationKey || '',
  displayName: saved?.displayName || '',
  relationKind: saved?.relationKind || 'reference',
  cardinality: '',
  columnMapping: saved?.columnMapping.map((row) => ({ ...row })) || [
    { sourceColumn: '', targetColumn: '' },
  ],
  conditions: saved?.conditions.map((row) => ({ ...row })) || [],
  description: saved?.description || '',
});
const error = ref('');
const saving = ref(false);
const item = Form.Item;
const textarea = Input.TextArea;
const tableChoices = computed(() =>
  props.tables.map((table) => ({
    label:
      tableLabel(table) === table.name
        ? table.name
        : `${tableLabel(table)} · ${table.name}`,
    value: table.name,
  })),
);
const kindChoices = Object.entries(relationKinds).map(([value, label]) => ({
  label,
  value,
}));
const sides = [
  { label: '来源表', value: 'source' },
  { label: '目标表', value: 'target' },
];
const operators = [
  { label: '等于', value: 'eq' },
  { label: '为空', value: 'isNull' },
  { label: '非空', value: 'isNotNull' },
];
const sourceColumns = computed(() => columnChoices(draft.sourceTable));
const targetColumns = computed(() => columnChoices(draft.targetTable));

function columnChoices(name: string) {
  return (props.tables.find((table) => table.name === name)?.columns || []).map(
    (column) => ({
      label: `${column.name} · ${column.dataType}`,
      value: column.name,
    }),
  );
}

function clearColumns(side: 'source' | 'target') {
  for (const row of draft.columnMapping) {
    if (side === 'source') row.sourceColumn = '';
    else row.targetColumn = '';
  }
  for (const condition of draft.conditions) {
    if (condition.side === side) condition.column = '';
  }
}

function validationError() {
  if (!draft.sourceTable || !draft.targetTable || !draft.displayName.trim())
    return '请选择来源表、目标表并填写显示名称';
  if (!/^[a-z][a-z0-9_]{0,119}$/u.test(draft.relationKey.trim()))
    return '关系标识须以小写字母开头，只能包含小写字母、数字和下划线';
  if (draft.columnMapping.some((row) => !row.sourceColumn || !row.targetColumn))
    return '请填写每组字段映射';
  if (
    draft.conditions.some(
      (row) => !row.column || (row.operator === 'eq' && row.value == null),
    )
  )
    return '请填写匹配条件的字段和值';
  if (
    draft.relationKind === 'polymorphic' &&
    !draft.conditions.some(
      (row) => row.side === 'source' && row.operator === 'eq',
    )
  ) {
    return '请添加来源表的等值判别条件';
  }
  return '';
}

async function submit() {
  if (saving.value) return;
  error.value = validationError();
  if (error.value) return;
  saving.value = true;
  try {
    const result = await saveSchemaRelation(
      {
        ...draft,
        relationKey: draft.relationKey.trim(),
        displayName: draft.displayName.trim(),
        cardinality: `${sourceCardinality.value}:${targetCardinality.value}`,
        conditions: draft.conditions.map((row) => ({
          ...row,
          value: row.operator === 'eq' ? row.value : null,
        })),
      },
      saved?.id,
    );
    emit('saved', result);
  } catch {
    // 请求层显示错误，保留当前表单供修改和重试。
  } finally {
    saving.value = false;
  }
}

function close() {
  if (!saving.value) emit('close');
}
</script>

<template>
  <Drawer
    :open="true"
    :title="relation ? '编辑逻辑关系' : '新增逻辑关系'"
    width="min(620px, 100vw)"
    :mask-closable="!saving"
    :root-style="{ maxWidth: '100vw' }"
    @close="close"
  >
    <Alert
      v-if="error"
      class="mb-3"
      type="warning"
      :message="error"
      show-icon
    />
    <Form layout="vertical" @submit.prevent="submit">
      <div class="editor-grid">
        <component
          :is="item"
          label="来源表"
          :html-for="`${fieldsId}-sourceTable`"
          required
        >
          <Select
            v-model:value="draft.sourceTable"
            :id="`${fieldsId}-sourceTable`"
            :options="tableChoices"
            show-search
            option-filter-prop="label"
            @change="clearColumns('source')"
          />
        </component>
        <component
          :is="item"
          label="目标表"
          :html-for="`${fieldsId}-targetTable`"
          required
        >
          <Select
            v-model:value="draft.targetTable"
            :id="`${fieldsId}-targetTable`"
            :options="tableChoices"
            show-search
            option-filter-prop="label"
            @change="clearColumns('target')"
          />
        </component>
        <component :is="item" label="显示名称" required>
          <Input
            v-model:value="draft.displayName"
            aria-label="显示名称"
            :maxlength="120"
          />
        </component>
        <component :is="item" label="关系标识" required>
          <Input
            v-model:value="draft.relationKey"
            aria-label="关系标识"
            :maxlength="120"
            placeholder="例如 related_read_record"
          />
        </component>
        <component
          :is="item"
          label="关系类型"
          :html-for="`${fieldsId}-relationKind`"
          required
        >
          <Select
            v-model:value="draft.relationKind"
            :id="`${fieldsId}-relationKind`"
            :options="kindChoices"
          />
        </component>
        <component :is="item" label="基数（来源 → 目标）" required>
          <div class="editor-counts">
            <label :for="`${fieldsId}-sourceCardinality`" class="sr-only"
              >来源基数</label
            >
            <Select
              :id="`${fieldsId}-sourceCardinality`"
              v-model:value="sourceCardinality"
              :options="multiplicities"
            />
            <span aria-hidden="true">→</span>
            <label :for="`${fieldsId}-targetCardinality`" class="sr-only"
              >目标基数</label
            >
            <Select
              :id="`${fieldsId}-targetCardinality`"
              v-model:value="targetCardinality"
              :options="multiplicities"
            />
          </div>
        </component>
      </div>

      <fieldset class="editor-section">
        <legend>等值字段映射</legend>
        <div
          v-for="(row, index) in draft.columnMapping"
          :key="index"
          class="editor-row"
        >
          <label :for="`${fieldsId}-sourceColumn-${index}`" class="sr-only"
            >来源字段 {{ index + 1 }}</label
          >
          <Select
            :id="`${fieldsId}-sourceColumn-${index}`"
            v-model:value="row.sourceColumn"
            :options="sourceColumns"
            show-search
            option-filter-prop="label"
          />
          <span aria-hidden="true">→</span>
          <label :for="`${fieldsId}-targetColumn-${index}`" class="sr-only"
            >目标字段 {{ index + 1 }}</label
          >
          <Select
            :id="`${fieldsId}-targetColumn-${index}`"
            v-model:value="row.targetColumn"
            :options="targetColumns"
            show-search
            option-filter-prop="label"
          />
          <Button
            size="small"
            :disabled="draft.columnMapping.length <= 1"
            @click="draft.columnMapping.splice(index, 1)"
          >
            删除
          </Button>
        </div>
        <Button
          size="small"
          :disabled="draft.columnMapping.length >= 16"
          @click="
            draft.columnMapping.push({ sourceColumn: '', targetColumn: '' })
          "
        >
          增加字段对
        </Button>
      </fieldset>

      <fieldset class="editor-section">
        <legend>匹配条件（全部满足）</legend>
        <div
          v-for="(row, index) in draft.conditions"
          :key="index"
          class="editor-condition"
        >
          <label :for="`${fieldsId}-side-${index}`" class="sr-only"
            >条件表 {{ index + 1 }}</label
          >
          <Select
            :id="`${fieldsId}-side-${index}`"
            v-model:value="row.side"
            :options="sides"
            @change="row.column = ''"
          />
          <label :for="`${fieldsId}-column-${index}`" class="sr-only"
            >条件字段 {{ index + 1 }}</label
          >
          <Select
            :id="`${fieldsId}-column-${index}`"
            v-model:value="row.column"
            :options="row.side === 'source' ? sourceColumns : targetColumns"
            show-search
            option-filter-prop="label"
          />
          <label :for="`${fieldsId}-operator-${index}`" class="sr-only"
            >条件运算符 {{ index + 1 }}</label
          >
          <Select
            :id="`${fieldsId}-operator-${index}`"
            v-model:value="row.operator"
            :options="operators"
          />
          <Input
            v-if="row.operator === 'eq'"
            :value="row.value ?? undefined"
            @update:value="row.value = $event"
            :aria-label="`条件值 ${index + 1}`"
            :maxlength="300"
          />
          <Button size="small" @click="draft.conditions.splice(index, 1)">
            删除
          </Button>
        </div>
        <Button
          size="small"
          :disabled="draft.conditions.length >= 16"
          @click="
            draft.conditions.push({
              side: 'source',
              column: '',
              operator: 'eq',
              value: '',
            })
          "
        >
          增加条件
        </Button>
      </fieldset>

      <component :is="item" label="业务说明">
        <component
          :is="textarea"
          :value="draft.description ?? undefined"
          @update:value="draft.description = $event"
          aria-label="业务说明"
          :maxlength="800"
          :rows="3"
        />
      </component>
    </Form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :disabled="saving" @click="close">取消</Button>
        <Button type="primary" :loading="saving" @click="submit">
          保存关系
        </Button>
      </div>
    </template>
  </Drawer>
</template>

<style scoped>
.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}
.editor-counts,
.editor-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 6px;
}
.editor-row {
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
}
.editor-condition {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.editor-condition :deep(.ant-select:nth-child(2)),
.editor-condition input {
  flex: 1 1 125px;
  min-width: 80px;
}
.editor-section {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}
.editor-section > button {
  justify-self: start;
}
.editor-section legend {
  color: hsl(var(--foreground));
  font-size: 14px;
  margin-bottom: 6px;
}
@media (max-width: 500px) {
  .editor-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
