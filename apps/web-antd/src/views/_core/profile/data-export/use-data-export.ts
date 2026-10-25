import type {
  ExportCatalog,
  ExportJob,
  ExportQuota,
} from '#/api/core/data-export';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import {
  authorizeExport,
  cancelExport,
  createExport,
  deleteExportArtifact,
  downloadExport,
  getExportCatalog,
  getExportJobs,
  getExportQuota,
} from '#/api/core/data-export';

/** 会话和页面生命周期隔离；后台刷新只替换数据，不清空旧内容。 */
export function useDataExport() {
  const access = useAccessStore();
  const catalog = ref<ExportCatalog>();
  const quota = ref<ExportQuota>();
  const jobs = ref<ExportJob[]>([]);
  const selected = ref<string[]>([]);
  const loading = ref(false);
  const action = ref('');
  const failed = ref(false);
  const page = ref(1);
  const total = ref(0);
  let revision = 0;
  let readSequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestKey = '';
  let transfer: AbortController | undefined;
  const active = computed(() =>
    jobs.value.some((job) => ['QUEUED', 'RUNNING'].includes(job.status)),
  );
  const canCreate = computed(
    () =>
      !!catalog.value &&
      (quota.value?.remaining ?? 0) > 0 &&
      selected.value.length > 0 &&
      !active.value &&
      !action.value,
  );

  function schedule() {
    clearTimeout(timer);
    if (active.value && !document.hidden)
      timer = setTimeout(() => void refresh(false), 5000);
  }
  async function refresh(includeCatalog = true) {
    const version = revision;
    const sequence = ++readSequence;
    loading.value = true;
    failed.value = false;
    try {
      const [nextQuota, history, nextCatalog] = await Promise.all([
        getExportQuota(),
        getExportJobs(page.value),
        includeCatalog ? getExportCatalog() : Promise.resolve(undefined),
      ]);
      if (version !== revision || sequence !== readSequence) return;
      quota.value = nextQuota;
      jobs.value = history.items;
      total.value = history.total;
      if (nextCatalog) {
        const first = !catalog.value;
        catalog.value = nextCatalog;
        if (first)
          selected.value = nextCatalog.datasets
            .filter((item) => item.state !== 'UNAVAILABLE')
            .map((item) => item.key);
      }
    } catch {
      if (version === revision && sequence === readSequence)
        failed.value = true;
    } finally {
      if (version === revision && sequence === readSequence) {
        loading.value = false;
        schedule();
      }
    }
  }
  async function submit(password: string) {
    const version = revision;
    action.value = 'create';
    try {
      const keys = [...selected.value];
      const catalogVersion = catalog.value!.version;
      const { grant } = await authorizeExport({
        purpose: 'CREATE',
        password,
        datasetKeys: keys,
      });
      if (version !== revision) return false;
      requestKey ||= crypto.randomUUID();
      await createExport(
        { datasetKeys: keys, catalogVersion },
        requestKey,
        grant,
      );
      if (version !== revision) return false;
      requestKey = '';
      page.value = 1;
      await refresh(false);
      return true;
    } finally {
      if (version === revision) action.value = '';
    }
  }
  async function download(job: ExportJob, password: string) {
    const version = revision;
    action.value = job.id;
    try {
      const { grant } = await authorizeExport({
        purpose: 'DOWNLOAD',
        password,
        jobId: job.id,
      });
      if (version !== revision) return;
      transfer = new AbortController();
      // fetch 的异常由页面显示；requestClient 的核验异常沿用全局提示。
      const blob = await downloadExport(job.id, grant, transfer.signal);
      if (version !== revision) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = job.fileName || 'aio-life-data.xlsx';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      if (version === revision) action.value = '';
    }
  }
  async function change(job: ExportJob, remove: boolean) {
    const version = revision;
    action.value = job.id;
    try {
      if (remove) await deleteExportArtifact(job.id);
      else await cancelExport(job.id);
      if (version === revision) await refresh(false);
    } finally {
      if (version === revision) action.value = '';
    }
  }
  function visibility() {
    if (document.hidden) clearTimeout(timer);
    else void refresh(false);
  }
  watch(
    selected,
    () => {
      requestKey = '';
    },
    { deep: true },
  );
  watch(page, () => void refresh(false));
  watch(
    () => access.accessToken,
    () => {
      revision++;
      transfer?.abort();
      clearTimeout(timer);
      loading.value = false;
      action.value = '';
      catalog.value = undefined;
      quota.value = undefined;
      jobs.value = [];
      selected.value = [];
      requestKey = '';
      page.value = 1;
      if (access.accessToken) void refresh();
    },
  );
  onMounted(() => {
    void refresh();
    document.addEventListener('visibilitychange', visibility);
  });
  onBeforeUnmount(() => {
    revision++;
    transfer?.abort();
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibility);
  });
  return {
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
    refresh,
    submit,
    download,
    change,
  };
}
