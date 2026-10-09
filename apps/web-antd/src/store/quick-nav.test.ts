import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';

import { useQuickNavStore } from './quick-nav';

const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('#/api/core/quick-nav', () => ({
  getMyQuickNavApi: api.get,
  saveMyQuickNavApi: api.save,
}));
beforeEach(() => {
  setActivePinia(createPinia());
  api.get.mockReset();
  api.save.mockReset();
});
const item = (title: string) => ({
  menuId: '9223372036854775807',
  title,
  path: '/task/todo',
  enabled: 1,
  sortOrder: 0,
});
function gate<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}
it('合并并发刷新；后续失败保留内容，初次失败可重试', async () => {
  const pending = gate<ReturnType<typeof item>[]>();
  api.get
    .mockReturnValueOnce(pending.promise)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue([item('恢复')]);
  const store = useQuickNavStore();
  const first = store.load();
  const second = store.load();
  expect(api.get).toHaveBeenCalledTimes(1);
  pending.resolve([item('原导航')]);
  await Promise.all([first, second]);
  await store.load();
  expect(store.items[0]?.title).toBe('原导航');
  expect(store.error).toBe('offline');
  await store.load();
  expect(store.items[0]?.title).toBe('恢复');
  expect(store.error).toBeNull();
  store.$reset();
  api.get.mockRejectedValueOnce(new Error('first failure'));
  await store.load();
  expect(store.loaded).toBe(true);
  expect(store.error).toBe('first failure');
  await store.load();
  expect(store.items[0]?.title).toBe('恢复');
});
it('保存和清空使旧查询失效，旧响应不能恢复已删除快捷项', async () => {
  const old = gate<ReturnType<typeof item>[]>();
  api.get.mockReturnValue(old.promise);
  api.save.mockResolvedValue([]);
  const store = useQuickNavStore();
  const pending = store.load();
  await store.clear();
  old.resolve([item('旧导航')]);
  await pending;
  expect(store.items).toEqual([]);
  expect(store.loading).toBe(false);
});
it('切换账户重置后，旧请求不清除新请求的 loading 或写回数据', async () => {
  const fresh = gate<ReturnType<typeof item>[]>();
  const old = gate<ReturnType<typeof item>[]>();
  api.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const store = useQuickNavStore();
  const first = store.load();
  store.$reset();
  const second = store.load();
  old.resolve([item('旧账户')]);
  await first;
  expect(store.loading).toBe(true);
  expect(store.items).toEqual([]);
  fresh.resolve([item('新账户')]);
  await second;
  expect(store.items[0]?.title).toBe('新账户');
});
