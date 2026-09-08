<script lang="ts" setup>
import type { ImportIssue } from './douban-import-parser';

import type { MovieApi } from '#/api/movie';

import { computed, ref } from 'vue';

import { InboxOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Descriptions,
  message,
  Radio,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';

import { MovieApi as MovieService } from '#/api/movie';

import { parseDoubanWorkbook } from './douban-import-parser';

const emit = defineEmits(['close', 'imported']);

const parsing = ref(false);
const importing = ref(false);
const fileName = ref('');
const request = ref<MovieApi.DoubanImportRequest>();
const preview = ref<MovieApi.DoubanImportPreview>();
const localIssues = ref<ImportIssue[]>([]);
const total = ref(0);
const duplicatePolicy = ref<'overwrite' | 'skip'>('skip');

const allIssues = computed(() => [
  ...localIssues.value,
  ...(preview.value?.errors ?? []),
]);
const duplicateIds = computed(
  () => new Set(preview.value?.duplicates.map((item) => item.doubanSubjectId)),
);
const orderedRecords = computed(() => {
  const records = request.value?.records ?? [];
  return [...records].sort(
    (a, b) =>
      Number(duplicateIds.value.has(a.doubanSubjectId)) -
      Number(duplicateIds.value.has(b.doubanSubjectId)),
  );
});
const columns = [
  { title: 'Excel 行', dataIndex: 'rowNumber', width: 84 },
  { title: '名称', dataIndex: 'title', ellipsis: true },
  { title: '看过日期', dataIndex: 'markedDate', width: 112 },
  { title: '评分', dataIndex: 'rating', width: 72 },
  { title: '判定', key: 'result', width: 96 },
];

const beforeUpload = async (file: File) => {
  parsing.value = true;
  fileName.value = file.name;
  request.value = undefined;
  preview.value = undefined;
  localIssues.value = [];
  try {
    const parsed = parseDoubanWorkbook(await file.arrayBuffer());
    request.value = parsed.request;
    localIssues.value = parsed.issues;
    total.value = parsed.total;
    preview.value = await MovieService.previewDoubanImport(parsed.request);
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'Excel 解析失败');
  } finally {
    parsing.value = false;
  }
  return false;
};

const submit = async () => {
  if (!request.value || !preview.value || allIssues.value.length > 0) return;
  importing.value = true;
  try {
    const result = await MovieService.importDouban({
      ...request.value,
      duplicatePolicy: duplicatePolicy.value,
    });
    message.success(
      `导入完成：新增 ${result.createdCount} 条，覆盖 ${result.updatedCount} 条，丢弃 ${result.skippedCount} 条`,
    );
    emit('imported');
    emit('close');
  } finally {
    importing.value = false;
  }
};
</script>

<template>
  <div>
    <Upload.Dragger
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      :before-upload="beforeUpload"
      :disabled="parsing || importing"
      :max-count="1"
      :show-upload-list="false"
    >
      <p class="ant-upload-drag-icon"><InboxOutlined /></p>
      <p class="ant-upload-text">选择或拖入 douban-exporter 生成的 Excel</p>
      <p class="ant-upload-hint">
        只接受固定格式的 .xlsx 文件，文件不会上传到豆瓣
      </p>
    </Upload.Dragger>

    <div v-if="fileName" class="mt-3 text-sm text-gray-500">
      当前文件：{{ fileName }}
    </div>

    <Descriptions v-if="preview" class="mt-4" bordered size="small" :column="2">
      <Descriptions.Item label="Excel 记录">{{ total }}</Descriptions.Item>
      <Descriptions.Item label="可新增">
        {{ preview.newCount }}
      </Descriptions.Item>
      <Descriptions.Item label="重复">
        {{ preview.duplicateCount }}
      </Descriptions.Item>
      <Descriptions.Item label="错误">{{ allIssues.length }}</Descriptions.Item>
    </Descriptions>

    <Alert
      v-if="allIssues.length > 0"
      class="mt-4"
      type="error"
      show-icon
      message="文件存在问题，修正后才能导入"
    >
      <template #description>
        <div
          v-for="issue in allIssues.slice(0, 8)"
          :key="`${issue.rowNumber}-${issue.message}`"
        >
          {{ issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ''
          }}{{ issue.message }}
        </div>
        <div v-if="allIssues.length > 8">
          另有 {{ allIssues.length - 8 }} 个问题
        </div>
      </template>
    </Alert>

    <div
      v-if="preview?.duplicateCount"
      class="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
    >
      <div class="mb-2 text-sm font-medium">发现重复记录，统一处理方式</div>
      <Radio.Group v-model:value="duplicatePolicy">
        <Radio value="skip">丢弃重复项（默认）</Radio>
        <Radio value="overwrite">覆盖当前记录的导入字段</Radio>
      </Radio.Group>
      <div class="mt-2 text-xs text-gray-500">
        覆盖不会修改封面、开始时间、进度和创建信息；Excel
        空白的导演、日期、评分或备注也不会清空原值。
      </div>
    </div>

    <Table
      v-if="orderedRecords.length > 0"
      class="mt-4"
      :columns="columns"
      :data-source="orderedRecords"
      :loading="parsing"
      :pagination="{ pageSize: 8, showSizeChanger: false }"
      :row-key="
        (row: MovieApi.DoubanImportRecord) =>
          `${row.rowNumber}-${row.doubanSubjectId}`
      "
      size="small"
      :scroll="{ x: 600 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'result'">
          <Tag v-if="duplicateIds.has(record.doubanSubjectId)" color="orange">
            重复
          </Tag>
          <Tag v-else color="green">新增</Tag>
        </template>
        <template v-else-if="column.dataIndex === 'rating'">
          {{ record.rating ? `${record.rating}/5` : '-' }}
        </template>
        <template v-else-if="column.dataIndex === 'markedDate'">
          {{ record.markedDate || '-' }}
        </template>
      </template>
    </Table>

    <div
      class="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800"
    >
      <Button @click="emit('close')">取消</Button>
      <Button
        type="primary"
        :disabled="!preview || allIssues.length > 0"
        :loading="importing || parsing"
        @click="submit"
      >
        确认导入
      </Button>
    </div>
  </div>
</template>
