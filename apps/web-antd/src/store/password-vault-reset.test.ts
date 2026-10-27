import { nextTick } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { usePasswordVaultStore } from './password-vault';

beforeEach(() => {
  sessionStorage.clear();
  setActivePinia(createPinia());
});
it('退出或注销重置时清除密码库主密钥和解锁状态', async () => {
  const store = usePasswordVaultStore();
  store.unlock('fixture-master-key');
  await nextTick();
  expect(store.masterKey).toBe('fixture-master-key');
  store.$reset();
  await nextTick();
  expect(store.masterKey).toBeNull();
  expect(store.isUnlocked).toBe(false);
  expect(
    sessionStorage.getItem('password-vault-master-key') || '',
  ).not.toContain('fixture-master-key');
});
