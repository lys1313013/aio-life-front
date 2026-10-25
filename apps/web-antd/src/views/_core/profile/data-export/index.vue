<script setup lang="ts">
import type { ExportJob } from '#/api/core/data-export';

import { ref } from 'vue';

import {
  DeleteOutlined,
  DownloadOutlined,
  LockOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Checkbox,
  CheckboxGroup,
  Empty,
  message,
  Pagination,
  Popconfirm,
  Spin,
  Tag,
} from 'ant-design-vue';

import { AppModal } from '#/components/app-modal';
import MaskedPasswordInput from '#/components/MaskedPasswordInput.vue';
import { useSecondaryLockStore } from '#/store/secondary-lock';

import { useDataExport } from './use-data-export';

const state = useDataExport();
const {
  catalog,
  quota,
  jobs,
  selected,
  loading,
  action,
  failed,
  page,
  total,
  canCreate,
} = state;
const locks = useSecondaryLockStore();
const open = ref(false);
const password = ref('');
const target = ref<ExportJob>();
const labels: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '生成中',
  SUCCEEDED: '已完成',
  FAILED: '生成失败',
  CANCELLED: '已取消',
  REVOKED: '已撤销',
};
function verify(job?: ExportJob) {
  target.value = job;
  password.value = '';
  open.value = true;
}
async function confirm() {
  if (!password.value || action.value) return;
  if (target.value) {
    try {
      await state.download(target.value, password.value);
      open.value = false;
    } catch (error) {
      // requestClient 自带提示；只有独立文件传输错误在此展示。
      if (
        error instanceof Error &&
        !('config' in error) &&
        !('response' in error)
      )
        message.error(error.message);
    }
  } else {
    try {
      if (await state.submit(password.value)) open.value = false;
    } catch {
      /* API 统一处理错误 */
    }
  }
  password.value = '';
}
function ready(job: ExportJob) {
  return job.status === 'SUCCEEDED' && job.artifactStatus === 'AVAILABLE';
}
</script>
<template>
  <section class="export-panel" aria-label="个人数据导出">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span
        >本月剩余 {{ quota?.remaining ?? '—' }} /
        {{ quota?.limit ?? 5 }} 次</span
      >
      <div class="flex items-center gap-2">
        <Button
          aria-label="刷新导出任务"
          :loading="loading"
          @click="state.refresh()"
        >
          <ReloadOutlined />
        </Button>
        <Button
          type="primary"
          :disabled="!canCreate"
          :loading="action === 'create'"
          @click="verify()"
        >
          生成 Excel
        </Button>
      </div>
    </div>
    <Alert
      v-if="failed"
      type="error"
      message="加载失败，请重试；若功能未启用，请联系管理员完成配置。"
    />
    <Spin v-if="!catalog && loading" class="export-initial" />
    <template v-if="catalog">
      <details>
        <summary class="cursor-pointer">
          导出范围（{{ selected.length }} 项）
        </summary>
        <CheckboxGroup
          v-model:value="selected"
          class="dataset-grid"
          :disabled="!!action"
        >
          <div
            v-for="item in catalog.datasets"
            :key="item.key"
            class="flex items-center gap-1"
          >
            <Checkbox
              :value="item.key"
              :disabled="item.state === 'UNAVAILABLE'"
            >
              {{ item.title }}
            </Checkbox>
            <Button
              v-if="item.state === 'LOCKED'"
              type="text"
              size="small"
              :aria-label="`解锁${item.title}`"
              @click="locks.triggerUnlock(item.lockedMenu!, false)"
            >
              <LockOutlined />
            </Button>
            <span
              v-if="item.state === 'UNAVAILABLE'"
              class="text-xs text-muted-foreground"
              >不可用</span
            >
          </div>
        </CheckboxGroup>
        <p
          v-for="note in catalog.exclusions"
          :key="note"
          class="mt-2 text-sm text-muted-foreground"
        >
          {{ note }}
        </p>
      </details>
      <p class="text-sm text-muted-foreground">
        文件保留
        {{ catalog.artifactHours ?? 24 }}
        小时。系统失败退还次数，开始处理后主动取消仍计次。
      </p>
    </template>
    <Empty
      v-if="!loading && !failed && jobs.length === 0"
      description="暂无导出记录"
    />
    <div v-for="job in jobs" :key="job.id" class="export-row">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <span>{{ job.createTime }}</span
          ><Tag>{{ labels[job.status] || job.status }}</Tag>
        </div>
        <div
          v-if="job.status === 'SUCCEEDED'"
          class="text-sm text-muted-foreground"
        >
          {{ job.rowCount }} 条 ·
          {{
            job.artifactStatus === 'AVAILABLE'
              ? `到期 ${job.expiresAt}`
              : '文件已失效'
          }}
        </div>
        <div v-if="job.errorCode" class="text-sm text-muted-foreground">
          生成未完成，请检查导出范围或稍后重试
        </div>
      </div>
      <Button
        v-if="ready(job)"
        :loading="action === job.id"
        aria-label="下载导出文件"
        @click="verify(job)"
      >
        <DownloadOutlined />
      </Button>
      <Popconfirm
        v-if="['QUEUED', 'RUNNING'].includes(job.status)"
        title="取消本次导出？已开始处理仍会计次。"
        @confirm="state.change(job, false)"
      >
        <Button :loading="action === job.id" aria-label="取消导出">
          <StopOutlined />
        </Button>
      </Popconfirm>
      <Popconfirm
        v-if="ready(job)"
        title="立即删除文件？不会退还生成次数。"
        @confirm="state.change(job, true)"
      >
        <Button :loading="action === job.id" aria-label="删除导出文件">
          <DeleteOutlined />
        </Button>
      </Popconfirm>
    </div>
    <Pagination
      v-if="total > 20"
      v-model:current="page"
      :total="total"
      :page-size="20"
      :show-size-changer="false"
    />
    <AppModal
      v-model:open="open"
      centered
      title="验证导出身份"
      ok-text="确认验证"
      :confirm-loading="!!action"
      @ok="confirm"
      @cancel="password = ''"
    >
      <MaskedPasswordInput
        v-model:value="password"
        :disabled="!!action"
        :placeholder="
          catalog?.verificationMethod === 'SECONDARY_PASSWORD'
            ? '输入二级密码'
            : '输入登录密码'
        "
      />
    </AppModal>
  </section>
</template>
<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.export-initial {
  padding: 48px 0;
}
.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
  margin-top: 12px;
  width: 100%;
}
.export-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}
</style>
