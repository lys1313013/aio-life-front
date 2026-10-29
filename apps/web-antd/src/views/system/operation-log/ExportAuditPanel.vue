<script setup lang="ts">
import type { ExportAudit } from '#/api/core/data-export';

import { onBeforeUnmount, ref } from 'vue';

import { Button, Table } from 'ant-design-vue';

import { getExportAudits } from '#/api/core/data-export';
import { AppModal } from '#/components/app-modal';

const open = ref(false);
const loading = ref(false);
const failed = ref(false);
const rows = ref<ExportAudit[]>([]);
const page = ref(1);
const total = ref(0);
let revision = 0;
const events: Record<string, string> = {
  AUTHORIZATION_SUCCEEDED: '身份核验通过',
  REQUEST_ACCEPTED: '受理申请',
  REQUEST_REPLAYED: '重复申请回放',
  REQUEST_DENIED: '拒绝请求',
  QUOTA_RESERVED: '预占额度',
  QUOTA_RELEASED: '退还额度',
  QUOTA_CONSUMED: '消耗额度',
  JOB_STARTED: '开始生成',
  JOB_RETRYING: '故障恢复',
  JOB_SUCCEEDED: '生成成功',
  JOB_FAILED: '生成失败',
  JOB_CANCELLED: '已取消',
  DATASET_FINISHED: '数据集读取完成',
  CANCEL_REQUESTED: '申请取消',
  DOWNLOAD_STARTED: '开始下载',
  DOWNLOAD_STREAM_COMPLETED: '传输完成',
  DOWNLOAD_INTERRUPTED: '传输中断',
  ARTIFACT_DELETED: '文件删除',
  ARTIFACT_EXPIRED: '文件到期',
  ARTIFACT_REVOKED: '文件撤销',
  CLEANUP_FAILED: '清理失败',
  ORPHAN_ARTIFACT_DELETED: '临时对象清理',
};
const columns = [
  { title: '时间', dataIndex: 'eventTime', width: 180 },
  { title: '用户 ID', dataIndex: 'userId', width: 190 },
  { title: '任务 ID', dataIndex: 'jobId', width: 190 },
  {
    title: '事件',
    dataIndex: 'eventType',
    width: 150,
    customRender: ({ text }: { text: string }) => events[text] || text,
  },
  { title: '结果', dataIndex: 'resultCode', width: 200 },
  { title: '请求 IP', dataIndex: 'clientIp', width: 150 },
];
async function load(next = 1) {
  const version = ++revision;
  loading.value = true;
  failed.value = false;
  try {
    const result = await getExportAudits(next);
    if (version !== revision) return;
    rows.value = result.items;
    total.value = result.total;
    page.value = next;
  } catch {
    if (version === revision) failed.value = true;
  } finally {
    if (version === revision) loading.value = false;
  }
}
function close() {
  revision++;
  loading.value = false;
  rows.value = [];
}
onBeforeUnmount(close);
</script>
<template>
  <Button
    @click="
      open = true;
      load();
    "
  >
    数据导出审计
  </Button>
  <AppModal
    v-model:open="open"
    title="数据导出审计"
    :footer="null"
    :width="1100"
    centered
    @cancel="close"
  >
    <div class="mb-3 flex justify-end">
      <Button :loading="loading" @click="load(page)">
        {{ failed ? '加载失败，重试' : '刷新' }}
      </Button>
    </div>
    <Table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      :loading="loading"
      :scroll="{ x: 1060 }"
      :pagination="{
        current: page,
        total,
        pageSize: 20,
        showSizeChanger: false,
        onChange: load,
      }"
    />
  </AppModal>
</template>
