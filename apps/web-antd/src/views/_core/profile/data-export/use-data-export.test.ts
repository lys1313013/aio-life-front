import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, reactive } from 'vue';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useDataExport } from './use-data-export';

const api = vi.hoisted(() => ({
  authorizeExport: vi.fn(),
  cancelExport: vi.fn(),
  createExport: vi.fn(),
  deleteExportArtifact: vi.fn(),
  downloadExport: vi.fn(),
  getExportCatalog: vi.fn(),
  getExportJobs: vi.fn(),
  getExportQuota: vi.fn(),
}));
let access: { accessToken: string };
vi.mock('@vben/stores', () => ({ useAccessStore: () => access }));
vi.mock('#/api/core/data-export', () => api);
enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.resetAllMocks();
  access = reactive({ accessToken: 'session-a' });
  api.getExportCatalog.mockResolvedValue({
    version: 'v1',
    datasets: [{ key: 'tasks', state: 'AVAILABLE' }],
  });
  api.getExportQuota.mockResolvedValue({ remaining: 5, limit: 5 });
  api.getExportJobs.mockResolvedValue({ items: [], total: 0 });
  api.authorizeExport.mockResolvedValue({ grant: 'grant' });
});
function setup() {
  let state!: ReturnType<typeof useDataExport>;
  mount(
    defineComponent({
      setup() {
        state = useDataExport();
        return () => h('div');
      },
    }),
  );
  return state;
}
it('申请响应丢失时重试沿用幂等键，成功后才换键', async () => {
  const state = setup();
  await flushPromises();
  api.createExport
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValue({ id: '1' });
  await expect(state.submit('secret')).rejects.toThrow('network');
  await state.submit('secret');
  expect(api.createExport.mock.calls[0]?.[1]).toBe(
    api.createExport.mock.calls[1]?.[1],
  );
  expect(api.createExport.mock.calls[0]?.[0]).toEqual({
    datasetKeys: ['tasks'],
    catalogVersion: 'v1',
  });
});
it('新页先返回后旧页响应不能覆盖结果', async () => {
  const state = setup();
  await flushPromises();
  let resolveOld!: (value: unknown) => void;
  api.getExportJobs.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const old = state.refresh(false);
  api.getExportJobs.mockResolvedValue({
    items: [{ id: 'page-two' }],
    total: 40,
  });
  state.page.value = 2;
  await nextTick();
  await flushPromises();
  resolveOld({ items: [{ id: 'page-one' }], total: 40 });
  await old;
  expect(state.jobs.value[0]?.id).toBe('page-two');
});
it('核验期间切换账户不提交旧账户申请', async () => {
  const state = setup();
  await flushPromises();
  let resolveGrant!: (value: unknown) => void;
  api.authorizeExport.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveGrant = resolve;
      }),
  );
  const pending = state.submit('secret');
  access.accessToken = 'session-b';
  await nextTick();
  resolveGrant({ grant: 'stale-grant' });
  await pending;
  expect(api.createExport).not.toHaveBeenCalled();
});
