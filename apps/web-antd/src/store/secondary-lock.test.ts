import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSecondaryLockStore } from './secondary-lock';

const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('#/api/core/auth', () => ({
  getSecondaryLockMenusApi: api.get,
  saveSecondaryLockMenusApi: api.save,
}));
beforeEach(() => {
  setActivePinia(createPinia());
  vi.resetAllMocks();
});
describe('二级锁字符串 ID', () => {
  it('相邻大整数加载、查询、去重保存不发生碰撞', async () => {
    const ids = ['9007199254740992', '9007199254740993'];
    api.get.mockResolvedValue(ids);
    const store = useSecondaryLockStore();
    await store.loadLockedMenus();
    expect(store.isMenuLocked(ids[1]!)).toBe(true);
    await store.saveLockedMenus([ids[1]!, ids[1]!], 'test-only');
    expect(api.save).toHaveBeenCalledWith({
      menuIds: [ids[1]],
      secondaryPassword: 'test-only',
    });
    expect(store.isMenuLocked(ids[0]!)).toBe(false);
    expect(store.isMenuLocked(ids[1]!)).toBe(true);
  });
  it('加载失败不标记完成，后续可恢复', async () => {
    api.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(['1']);
    const store = useSecondaryLockStore();
    await store.loadLockedMenus();
    expect(store.loaded).toBe(false);
    await store.loadLockedMenus();
    expect(store.isMenuLocked('1')).toBe(true);
  });
});

describe('二级锁授权期限', () => {
  const ttl = 29 * 60 * 1000;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    useSecondaryLockStore().$reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('每条路径解锁 29 分钟后主动移除，互不影响', () => {
    const store = useSecondaryLockStore();
    store.unlock('/memo');
    vi.advanceTimersByTime(60 * 1000);
    store.unlock('/expense');
    vi.advanceTimersByTime(ttl - 60 * 1000 - 1);
    expect(store.isUnlocked('/memo')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.unlockedPaths.has('/memo')).toBe(false);
    expect(store.isUnlocked('/expense')).toBe(true);
  });

  it('重新解锁从当前时刻重新计时，只保留一个定时器', () => {
    const store = useSecondaryLockStore();
    store.unlock('/memo');
    vi.advanceTimersByTime(10 * 60 * 1000);
    store.unlock('/memo');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(ttl - 1);
    expect(store.isUnlocked('/memo')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.isUnlocked('/memo')).toBe(false);
  });

  it('$reset 清空所有授权和定时器', () => {
    const store = useSecondaryLockStore();
    store.unlock('/memo');
    store.unlock('/expense');
    store.$reset();
    expect(vi.getTimerCount()).toBe(0);
    expect(store.unlockedPaths.size).toBe(0);
  });

  it('旧回调即使已排队也不能撤销重新获得的授权', () => {
    const timeout = vi.spyOn(globalThis, 'setTimeout');
    const store = useSecondaryLockStore();
    store.unlock('/memo');
    const oldCallback = timeout.mock.calls[0]?.[0] as () => void;
    store.$reset();
    store.unlock('/memo');
    oldCallback();
    expect(store.isUnlocked('/memo')).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(ttl);
    expect(store.isUnlocked('/memo')).toBe(false);
  });
});
