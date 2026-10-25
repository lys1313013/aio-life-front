<script setup lang="ts">
import type {
  ScheduledJobLogVO,
  ScheduledJobVO,
} from '#/api/core/scheduled-job';

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

import {
  EditOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Pagination,
  Popconfirm,
  Select,
  Skeleton,
  Spin,
  Switch,
  Tag,
} from 'ant-design-vue';

import {
  queryScheduledJobLogs,
  queryScheduledJobs,
  runScheduledJob,
  updateScheduledJob,
} from '#/api/core/scheduled-job';
import { AppModal } from '#/components/app-modal';

const jobs = ref<ScheduledJobVO[]>([]);
const loading = ref(false);
const loaded = ref(false);
const loadFailed = ref(false);
const busy = ref<Record<string, boolean>>({});
const editing = ref<null | ScheduledJobVO>(null);
const editOpen = ref(false);
const saving = ref(false);
const mode = ref<'cron' | 'daily'>('daily');
const dailyTime = ref('07:00');
const cron = ref('0 0 7 * * ?');
const formError = ref('');
const logJob = ref<null | ScheduledJobVO>(null);
const logOpen = ref(false);
const logs = ref<ScheduledJobLogVO[]>([]);
const logsLoading = ref(false);
const logsLoaded = ref(false);
const logsFailed = ref(false);
const page = ref(1);
const total = ref(0);
let listVersion = 0;
let logVersion = 0;
let poll: ReturnType<typeof setInterval> | undefined;
let active = true;
const effectiveCron = computed(() => {
  if (mode.value === 'cron') return cron.value.trim();
  const [hours, minutes] = dailyTime.value.split(':');
  return `0 ${Number(minutes)} ${Number(hours)} * * ?`;
});
const statusLabels = {
  FAILED: '失败',
  INTERRUPTED: '结果未知',
  RUNNING: '执行中',
  SKIPPED: '已跳过',
  SUCCESS: '完成',
};
const statusColors = {
  FAILED: 'error',
  INTERRUPTED: 'warning',
  RUNNING: 'processing',
  SKIPPED: 'default',
  SUCCESS: 'success',
};

async function loadJobs() {
  const version = ++listVersion;
  loading.value = true;
  try {
    const result = await queryScheduledJobs();
    if (version !== listVersion) return;
    jobs.value = result;
    loaded.value = true;
    loadFailed.value = false;
  } catch {
    if (version === listVersion) loadFailed.value = true;
  } finally {
    if (version === listVersion) loading.value = false;
  }
}
function replaceJob(updated: ScheduledJobVO) {
  ++listVersion;
  loading.value = false;
  jobs.value = jobs.value.map((job) => (job.id === updated.id ? updated : job));
}
async function toggle(job: ScheduledJobVO) {
  if (busy.value[job.id]) return;
  busy.value[job.id] = true;
  try {
    replaceJob(
      await updateScheduledJob(job.id, {
        cron: job.cron,
        enabled: !job.enabled,
        revision: job.revision,
      }),
    );
  } catch {
    /* 请求拦截器提示，保留原开关。 */
  } finally {
    busy.value[job.id] = false;
  }
}
function edit(job: ScheduledJobVO) {
  editing.value = { ...job };
  cron.value = job.cron;
  formError.value = '';
  const daily = /^0 (\d{1,2}) (\d{1,2}) \* \* [*?]$/.exec(job.cron);
  mode.value = daily ? 'daily' : 'cron';
  dailyTime.value = daily
    ? `${daily[2]!.padStart(2, '0')}:${daily[1]!.padStart(2, '0')}`
    : '07:00';
  editOpen.value = true;
}
async function save() {
  if (!editing.value || saving.value) return;
  if (
    (mode.value === 'daily' && !/^\d{2}:\d{2}$/.test(dailyTime.value)) ||
    !effectiveCron.value
  ) {
    formError.value = '请填写执行时间';
    return;
  }
  saving.value = true;
  try {
    replaceJob(
      await updateScheduledJob(editing.value.id, {
        cron: effectiveCron.value,
        enabled: editing.value.enabled,
        revision: editing.value.revision,
      }),
    );
    editOpen.value = false;
    message.success('已保存');
  } catch {
    /* 请求拦截器提示。 */
  } finally {
    saving.value = false;
  }
}
async function run(job: ScheduledJobVO) {
  if (busy.value[job.id]) return;
  busy.value[job.id] = true;
  try {
    await runScheduledJob(job.id);
    message.success('已提交执行');
    openLogs(job);
  } catch {
    /* 请求拦截器提示。 */
  } finally {
    busy.value[job.id] = false;
  }
}
function openLogs(job: ScheduledJobVO) {
  ++logVersion;
  logJob.value = job;
  logs.value = [];
  page.value = 1;
  total.value = 0;
  logsLoaded.value = false;
  logsFailed.value = false;
  logOpen.value = true;
  void loadLogs();
  startPoll();
}
async function loadLogs(targetPage = page.value) {
  if (!logJob.value) return;
  const version = ++logVersion;
  logsLoading.value = true;
  try {
    const result = await queryScheduledJobLogs(logJob.value.id, targetPage);
    if (version !== logVersion || !logOpen.value) return;
    logs.value = result.items;
    total.value = result.total;
    page.value = targetPage;
    logsLoaded.value = true;
    logsFailed.value = false;
  } catch {
    if (version === logVersion) {
      logsFailed.value = true;
      stopPoll();
    }
  } finally {
    if (version === logVersion) logsLoading.value = false;
  }
}
function stopPoll() {
  if (poll) clearInterval(poll);
  poll = undefined;
}
function startPoll() {
  stopPoll();
  if (!active || !logOpen.value) return;
  poll = setInterval(() => {
    if (document.visibilityState === 'visible' && !logsLoading.value)
      void loadLogs();
  }, 5000);
}
async function retryLogs() {
  await loadLogs();
  if (!logsFailed.value) startPoll();
}
watch(logOpen, (open) => {
  if (!open) {
    ++logVersion;
    logsLoading.value = false;
    stopPoll();
  }
});
onMounted(() => void loadJobs());
onActivated(() => {
  active = true;
  if (!loading.value) void loadJobs();
  startPoll();
});
onDeactivated(() => {
  active = false;
  ++listVersion;
  ++logVersion;
  loading.value = false;
  logsLoading.value = false;
  stopPoll();
});
onBeforeUnmount(() => {
  ++listVersion;
  ++logVersion;
  stopPoll();
});
</script>

<template>
  <div class="min-h-full bg-background/50 p-4 lg:p-6">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-xl font-bold text-card-foreground">定时任务</h2>
      <Button aria-label="刷新任务" :loading="loading" @click="loadJobs">
        <ReloadOutlined />
      </Button>
    </div>
    <Alert
      v-if="jobs.some((job) => !job.schedulerEnabled)"
      class="mb-4"
      type="warning"
      message="当前服务的任务调度总开关已关闭"
    />
    <Alert
      v-if="loadFailed"
      class="mb-4"
      type="error"
      message="任务加载失败，请刷新重试"
    />
    <div
      v-if="!loaded && loading"
      class="grid gap-4 lg:grid-cols-2"
      aria-label="加载任务"
    >
      <div v-for="item in 2" :key="item" class="rounded-xl bg-card p-5">
        <Skeleton active :paragraph="{ rows: 4 }" />
      </div>
    </div>
    <Empty v-else-if="loaded && jobs.length === 0" description="暂无任务" />
    <div v-else class="grid items-start gap-4 lg:grid-cols-2">
      <section
        v-for="job in jobs"
        :key="job.id"
        class="min-w-0 rounded-xl bg-card p-5 text-card-foreground"
        :aria-label="job.name"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="min-w-0 break-words font-medium">{{ job.name }}</h3>
          <Switch
            :aria-label="`${job.name}自动调度`"
            :checked="job.enabled"
            :loading="busy[job.id]"
            @change="toggle(job)"
          />
        </div>
        <dl class="space-y-2 text-sm">
          <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt class="text-muted-foreground">执行规则</dt>
            <dd class="break-all font-mono">{{ job.cron }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt class="text-muted-foreground">时区</dt>
            <dd>{{ job.zoneId }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt class="text-muted-foreground">下次执行</dt>
            <dd>
              {{
                job.nextExecutionTime ?? (job.enabled ? '调度已关闭' : '已暂停')
              }}
            </dd>
          </div>
        </dl>
        <div class="mt-4 flex justify-end gap-2">
          <Button
            :aria-label="`编辑${job.name}`"
            :disabled="busy[job.id]"
            @click="edit(job)"
          >
            <EditOutlined />
          </Button>
          <Popconfirm
            :title="`立即执行「${job.name}」？可能触发业务通知。`"
            ok-text="执行"
            cancel-text="取消"
            :disabled="busy[job.id] || !job.schedulerEnabled"
            @confirm="run(job)"
          >
            <Button
              :aria-label="`立即执行${job.name}`"
              :loading="busy[job.id]"
              :disabled="!job.schedulerEnabled"
            >
              <PlayCircleOutlined />
            </Button>
          </Popconfirm>
          <Button :aria-label="`查看${job.name}日志`" @click="openLogs(job)">
            <HistoryOutlined />
          </Button>
        </div>
      </section>
    </div>
    <AppModal
      v-model:open="editOpen"
      :title="editing?.name"
      :width="480"
      :confirm-loading="saving"
      @ok="save"
    >
      <div class="space-y-4">
        <label class="block space-y-2"
          ><span>执行方式</span
          ><Select
            v-model:value="mode"
            class="w-full"
            aria-label="执行方式"
            :options="[
              { label: '每天', value: 'daily' },
              { label: '自定义 Cron', value: 'cron' },
            ]"
        /></label>
        <label v-if="mode === 'daily'" class="block space-y-2"
          ><span>执行时间（北京时间）</span
          ><Input v-model:value="dailyTime" type="time" aria-label="执行时间"
        /></label>
        <label v-else class="block space-y-2"
          ><span>Cron（秒 分 时 日 月 周）</span
          ><Input
            v-model:value="cron"
            :maxlength="100"
            aria-label="Cron表达式"
            placeholder="0 30 23 * * ?"
          /><span class="block text-sm text-muted-foreground"
            >秒填写 0～59 的单个整数，每分钟最多一次。</span
          ></label
        >
        <Alert v-if="formError" type="error" :message="formError" />
      </div>
    </AppModal>
    <AppModal
      v-model:open="logOpen"
      :title="`${logJob?.name ?? ''} · 执行日志`"
      :width="840"
      :footer="null"
      :submit-on-enter="false"
    >
      <div class="mb-3 flex justify-end">
        <Button aria-label="刷新日志" :loading="logsLoading" @click="retryLogs">
          <ReloadOutlined />
        </Button>
      </div>
      <Alert
        v-if="logsFailed"
        class="mb-3"
        type="error"
        message="日志加载失败，请刷新重试"
      />
      <Spin :spinning="logsLoading" :delay="150">
        <div class="min-h-48 space-y-3">
          <Skeleton
            v-if="!logsLoaded && logsLoading"
            active
            :paragraph="{ rows: 5 }"
          />
          <Empty
            v-else-if="logsLoaded && logs.length === 0"
            description="暂无执行日志"
          />
          <article
            v-for="entry in logs"
            :key="entry.id"
            class="rounded-lg bg-background/50 p-3 text-sm"
          >
            <div class="flex flex-wrap items-center gap-2">
              <Tag :color="statusColors[entry.status]">
                {{ statusLabels[entry.status] }}
              </Tag>
              <span>{{ entry.triggerType === 'AUTO' ? '定时' : '手动' }}</span>
              <time>{{ entry.startTime }}</time>
              <span
                v-if="entry.durationMs !== null"
                class="text-muted-foreground"
              >
                {{ entry.durationMs }} ms
              </span>
            </div>
            <p v-if="entry.message" class="mt-2 break-words">
              {{ entry.message }}
            </p>
            <p class="mt-2 break-all text-xs text-muted-foreground">
              日志 ID：{{ entry.id
              }}<template v-if="entry.createUser">
                · 操作人 ID：{{ entry.createUser }}
              </template>
            </p>
          </article>
        </div>
      </Spin>
      <Pagination
        v-if="total > 20"
        class="mt-4"
        :current="page"
        :total="total"
        :page-size="20"
        :show-size-changer="false"
        :disabled="logsLoading"
        size="small"
        @change="loadLogs"
      />
    </AppModal>
  </div>
</template>
