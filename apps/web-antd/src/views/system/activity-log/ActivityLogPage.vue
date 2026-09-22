<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import type {
  ActivityLog,
  ActivityLogQuery,
  ActivityLogType,
} from '#/api/system/activity-log';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  message,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  exportActivityLogs,
  queryActivityLogs,
} from '#/api/system/activity-log';

const props = defineProps<{ type: ActivityLogType }>();
const router = useRouter();
const RangePicker = DatePicker.RangePicker;
const TabPane = Tabs.TabPane;
const defaultDates = (): [Dayjs, Dayjs] => [
  dayjs().subtract(7, 'day'),
  dayjs(),
];
const dates = ref<[Dayjs, Dayjs] | undefined>(defaultDates());
const username = ref('');
const loading = ref(false);
const exporting = ref(false);
const failed = ref(false);
const rows = ref<ActivityLog[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
let requestId = 0;
// 翻页与导出使用已提交的筛选，避免输入未查询时与列表不一致。
let filters: ActivityLogQuery = readFilters();

const columns = computed(() => [
  { title: '序号', key: 'index', width: 64 },
  { title: '用户账号', dataIndex: 'username', width: 140, ellipsis: true },
  { title: '用户名称', dataIndex: 'nickname', width: 120, ellipsis: true },
  { title: 'IP地址', dataIndex: 'ipAddress', width: 150, ellipsis: true },
  { title: '浏览器', dataIndex: 'browser', width: 110, ellipsis: true },
  ...(props.type === 'operation'
    ? [
        {
          title: '功能名称',
          dataIndex: 'functionName',
          width: 140,
          ellipsis: true,
        },
        { title: '功能项', dataIndex: 'functionItem', width: 90 },
      ]
    : [{ title: '登录方式', dataIndex: 'accessType', width: 130 }]),
  { title: '结果', key: 'success', width: 80 },
  { title: '操作时间', dataIndex: 'createTime', width: 180 },
]);
const pagination = computed<TablePaginationConfig>(() => ({
  current: page.value,
  pageSize: pageSize.value,
  pageSizeOptions: ['20', '50', '100'],
  showSizeChanger: true,
  showTotal: (count) => `共 ${count} 条`,
  total: total.value,
}));

function readFilters(): ActivityLogQuery {
  return {
    endDate: dates.value?.[1]?.format('YYYY-MM-DD'),
    startDate: dates.value?.[0]?.format('YYYY-MM-DD'),
    username: username.value.trim() || undefined,
  };
}

async function load() {
  const currentRequest = ++requestId;
  loading.value = true;
  failed.value = false;
  try {
    const result = await queryActivityLogs(props.type, {
      ...filters,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (currentRequest !== requestId) return;
    rows.value = result.items;
    total.value = Number(result.total);
  } catch {
    if (currentRequest !== requestId) return;
    rows.value = [];
    total.value = 0;
    failed.value = true;
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

function search() {
  filters = readFilters();
  page.value = 1;
  void load();
}

function reset() {
  dates.value = defaultDates();
  username.value = '';
  search();
}

function changePage(value: TablePaginationConfig) {
  page.value = value.pageSize === pageSize.value ? (value.current ?? 1) : 1;
  pageSize.value = value.pageSize ?? 20;
  void load();
}

async function exportAll() {
  exporting.value = true;
  try {
    const blob = await exportActivityLogs(props.type, filters);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.type === 'operation' ? '操作日志' : '访问日志'}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出失败，请重试');
  } finally {
    exporting.value = false;
  }
}

function changeTab(key: number | string) {
  void router.push(`/system/${key}-log`);
}

onMounted(load);
</script>

<template>
  <section
    class="activity-log-page m-3 min-w-0 rounded-lg bg-background p-3 md:m-4 md:p-4"
  >
    <Tabs :active-key="type" @change="changeTab">
      <TabPane key="operation" tab="操作日志" />
      <TabPane key="access" tab="访问日志" />
    </Tabs>
    <form class="log-filters mb-4" @submit.prevent="search">
      <label class="date-filter flex min-w-0 items-center gap-2">
        <span class="shrink-0">操作日期</span>
        <RangePicker
          v-model:value="dates"
          class="min-w-0 flex-1"
          :allow-clear="true"
          :placeholder="['开始日期', '结束日期']"
          :input-read-only="true"
        />
      </label>
      <label class="account-filter flex min-w-0 items-center gap-2">
        <span class="shrink-0">用户账号</span>
        <Input
          v-model:value="username"
          aria-label="用户账号"
          allow-clear
          :maxlength="100"
        />
      </label>
      <div class="filter-actions flex items-center gap-2">
        <Button
          type="primary"
          html-type="submit"
          aria-label="查询"
          :loading="loading"
        >
          <template #icon><SearchOutlined /></template>
        </Button>
        <Button aria-label="重置" :disabled="loading" @click="reset">
          <template #icon><ReloadOutlined /></template>
        </Button>
        <Button
          aria-label="导出全部"
          :loading="exporting"
          :disabled="loading || failed"
          @click="exportAll"
        >
          <template #icon><DownloadOutlined /></template>
        </Button>
      </div>
    </form>
    <Alert
      v-if="failed"
      class="mb-3"
      message="日志加载失败，请重试"
      type="error"
      show-icon
    />
    <Table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: type === 'operation' ? 1074 : 974 }"
      :locale="{ emptyText: failed ? '加载失败' : '暂无日志' }"
      row-key="id"
      size="small"
      @change="changePage"
    >
      <template #bodyCell="{ column, record, index, text }">
        <template v-if="column.key === 'index'">
          {{ (page - 1) * pageSize + index + 1 }}
        </template>
        <Tag
          v-else-if="column.key === 'success'"
          :color="record.success ? 'success' : 'error'"
          :bordered="false"
        >
          {{ record.success ? '成功' : '失败' }}
        </Tag>
        <template v-else>{{ text || '—' }}</template>
      </template>
    </Table>
  </section>
</template>

<style scoped>
.activity-log-page {
  container-type: inline-size;
}

.log-filters {
  display: grid;
  grid-template-columns: minmax(310px, 380px) minmax(200px, 280px) auto;
  gap: 12px 16px;
  align-items: center;
  justify-content: start;
}

@container (max-width: 850px) {
  .log-filters {
    grid-template-columns: minmax(280px, 380px) minmax(190px, 260px);
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@container (max-width: 540px) {
  .log-filters {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
