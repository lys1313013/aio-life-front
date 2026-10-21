<script setup lang="ts">
import type { TablePaginationConfig } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';

import type {
  ActivityLog,
  ActivityLogDetail,
  ActivityLogQuery,
  ActivityLogType,
} from '#/api/system/activity-log';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  CopyOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  message,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  exportActivityLogs,
  queryActivityLogs,
  readOperationLog,
} from '#/api/system/activity-log';
import { AppModal } from '#/components/app-modal';

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
const total = ref<number | undefined>(0);
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailFailed = ref(false);
const detailId = ref('');
const detail = ref<ActivityLogDetail>();
let requestId = 0;
let detailRequestId = 0;
// 翻页和导出始终使用已提交的筛选。
let filters: ActivityLogQuery = readFilters();

const columns = computed(() =>
  props.type === 'operation'
    ? [
        { title: '序号', key: 'index', width: 64 },
        { title: '用户ID', dataIndex: 'userId', width: 180, ellipsis: true },
        { title: '用户名', dataIndex: 'username', width: 140, ellipsis: true },
        { title: '功能点', key: 'function', width: 180, ellipsis: true },
        {
          title: '请求地址',
          dataIndex: 'requestPath',
          width: 240,
          ellipsis: true,
        },
        { title: '请求方式', dataIndex: 'requestMethod', width: 100 },
        { title: '请求参数', key: 'params', width: 90 },
        { title: '请求时间', key: 'requestTime', width: 220 },
        { title: '处理时间', key: 'duration', width: 120 },
        { title: '请求IP', dataIndex: 'ipAddress', width: 160, ellipsis: true },
        {
          title: '服务器IP',
          dataIndex: 'serverIp',
          width: 160,
          ellipsis: true,
        },
        { title: '结果', key: 'success', width: 80 },
      ]
    : [
        { title: '序号', key: 'index', width: 64 },
        {
          title: '用户账号',
          dataIndex: 'username',
          width: 140,
          ellipsis: true,
        },
        {
          title: '用户名称',
          dataIndex: 'nickname',
          width: 120,
          ellipsis: true,
        },
        { title: 'IP地址', dataIndex: 'ipAddress', width: 150, ellipsis: true },
        { title: '浏览器', dataIndex: 'browser', width: 110, ellipsis: true },
        { title: '登录方式', dataIndex: 'accessType', width: 130 },
        { title: '结果', key: 'success', width: 80 },
        { title: '操作时间', dataIndex: 'createTime', width: 180 },
      ],
);
const pagination = computed<TablePaginationConfig>(() => ({
  current: page.value,
  pageSize: pageSize.value,
  pageSizeOptions: ['20', '50', '100'],
  showSizeChanger: true,
  showTotal: (count) => `共 ${count} 条`,
  total: total.value,
}));
const parameterText = computed(() => {
  const params = detail.value?.requestParams;
  if (params === null || params === undefined) return '未采集';
  if (Object.keys(params).length === 0) return '无参数';
  return JSON.stringify(params, null, 2);
});

function readFilters(): ActivityLogQuery {
  const result: ActivityLogQuery = {
    endDate: dates.value?.[1]?.format('YYYY-MM-DD'),
    startDate: dates.value?.[0]?.format('YYYY-MM-DD'),
    username: username.value.trim() || undefined,
  };
  return result;
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
    total.value = result.total ?? undefined;
  } catch {
    if (currentRequest === requestId) failed.value = true;
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

async function openDetail(id: string) {
  detailId.value = id;
  detailOpen.value = true;
  detailLoading.value = true;
  detailFailed.value = false;
  if (detail.value?.id !== id) detail.value = undefined;
  const current = ++detailRequestId;
  try {
    const result = await readOperationLog(id);
    if (current === detailRequestId) detail.value = result;
  } catch {
    if (current === detailRequestId) detailFailed.value = true;
  } finally {
    if (current === detailRequestId) detailLoading.value = false;
  }
}

function closeDetail() {
  ++detailRequestId;
  detailOpen.value = false;
  detailLoading.value = false;
}

async function copyParameters() {
  try {
    await navigator.clipboard.writeText(parameterText.value);
    message.success('已复制');
  } catch {
    message.error('复制失败');
  }
}

async function exportAll() {
  exporting.value = true;
  let blob: Blob;
  try {
    blob = await exportActivityLogs(props.type, filters);
  } catch (error) {
    if (error instanceof Error && error.name === 'ActivityLogExportError')
      message.error(error.message);
    exporting.value = false;
    return;
  }
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${props.type === 'operation' ? '操作日志' : '访问日志'}-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    exporting.value = false;
  }
}

function changeTab(key: number | string) {
  void router.push(`/system/${key}-log`);
}
onMounted(load);
onBeforeUnmount(() => {
  ++requestId;
  ++detailRequestId;
});
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
        <span class="shrink-0">{{
          type === 'operation' ? '请求日期' : '操作日期'
        }}</span>
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
    <div class="log-results" :aria-busy="loading">
      <Alert
        v-if="failed"
        class="log-error"
        message="日志加载失败，请重试"
        type="error"
        show-icon
      >
        <template #action>
          <Button
            size="small"
            aria-label="重试日志"
            :loading="loading"
            @click="load"
          >
            重试
          </Button>
        </template>
      </Alert>
      <Table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: type === 'operation' ? 1834 : 974 }"
        :locale="{ emptyText: failed ? '加载失败' : '暂无日志' }"
        row-key="id"
        size="small"
        @change="changePage"
      >
        <template #bodyCell="{ column, record, index, text }">
          <template v-if="column.key === 'index'">
            {{ (page - 1) * pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'function'">
            {{
              [record.functionName, record.functionItem]
                .filter(Boolean)
                .join(' · ') || '接口操作'
            }}
          </template>
          <Button
            v-else-if="column.key === 'params'"
            type="text"
            aria-label="查看请求参数"
            @click="openDetail(record.id)"
          >
            <template #icon><FileSearchOutlined /></template>
          </Button>
          <template v-else-if="column.key === 'requestTime'">
            <span>{{ record.requestTime || record.createTime }}</span>
            <span
              v-if="!record.requestTime"
              class="block text-xs text-muted-foreground"
              >历史记录时间</span
            >
          </template>
          <template v-else-if="column.key === 'duration'">
            {{
              record.durationMs === null || record.durationMs === undefined
                ? '未采集'
                : `${record.durationMs} ms`
            }}
          </template>
          <Tag
            v-else-if="column.key === 'success'"
            :color="record.success ? 'success' : 'error'"
            :bordered="false"
          >
            {{ record.success ? '成功' : '失败' }}
          </Tag>
          <template v-else>
            {{
              text ??
              (['requestMethod', 'serverIp'].includes(String(column.dataIndex))
                ? '未采集'
                : '—')
            }}
          </template>
        </template>
      </Table>
    </div>
    <AppModal
      :open="detailOpen"
      title="请求参数"
      :footer="null"
      :width="720"
      :submit-on-enter="false"
      @cancel="closeDetail"
    >
      <div class="parameter-detail">
        <Spin :spinning="detailLoading">
          <div class="parameter-content">
            <Alert
              v-if="detailFailed"
              message="参数加载失败"
              type="error"
              class="parameter-error"
              show-icon
            >
              <template #action>
                <Button
                  aria-label="重试参数"
                  :loading="detailLoading"
                  @click="openDetail(detailId)"
                >
                  重试
                </Button>
              </template>
            </Alert>
            <template v-if="detail">
              <div class="mb-3 flex items-start justify-between gap-3">
                <span class="break-all text-muted-foreground"
                  >{{ detail.requestMethod }} {{ detail.requestPath }}</span
                ><Button
                  v-if="
                    detail.requestParams &&
                    Object.keys(detail.requestParams).length > 0
                  "
                  aria-label="复制参数"
                  @click="copyParameters"
                >
                  <template #icon><CopyOutlined /></template>
                </Button>
              </div>
              <dl
                class="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground"
              >
                <div>
                  <dt class="inline">昵称：</dt>
                  <dd class="inline">{{ detail.nickname || '—' }}</dd>
                </div>
                <div>
                  <dt class="inline">浏览器：</dt>
                  <dd class="inline">{{ detail.browser || '—' }}</dd>
                </div>
                <div class="col-span-2">
                  <dt class="inline">记录时间：</dt>
                  <dd class="inline">{{ detail.createTime }}</dd>
                </div>
              </dl>
              <pre class="parameter-json bg-muted/40 text-foreground">{{
                parameterText
              }}</pre>
            </template>
          </div>
        </Spin>
      </div>
    </AppModal>
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

.log-results {
  position: relative;
  min-height: 220px;
}

.log-error {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  left: 0;
}

.parameter-content {
  position: relative;
  min-height: 160px;
}

.parameter-error {
  position: absolute;
  z-index: 2;
  top: 0;
  right: 0;
  left: 0;
}

.parameter-json {
  max-height: 55vh;
  margin: 0;
  overflow: auto;
  padding: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
