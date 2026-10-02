import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
