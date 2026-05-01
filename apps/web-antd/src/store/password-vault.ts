import { computed } from 'vue';

import { useSessionStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

export const usePasswordVaultStore = defineStore('password-vault', () => {
  const isUnlocked = useSessionStorage('password-vault-unlocked', false);
  const masterKey = useSessionStorage<null | string>(
    'password-vault-master-key',
    null,
  );
  const lastActivityTime = useSessionStorage(
    'password-vault-activity',
    Date.now(),
  );
  const lockTimeout = 30 * 60 * 1000; // 30 minutes

  const isLocked = computed(() => !isUnlocked.value);

  function unlock(key: string) {
    masterKey.value = key;
    isUnlocked.value = true;
    updateActivity();
  }

  function lock() {
    masterKey.value = null;
    isUnlocked.value = false;
  }

  function updateActivity() {
    lastActivityTime.value = Date.now();
  }

  function checkTimeout() {
    if (isUnlocked.value && Date.now() - lastActivityTime.value > lockTimeout) {
      lock();
      return true;
    }
    return false;
  }

  return {
    isUnlocked,
    isLocked,
    masterKey,
    unlock,
    lock,
    updateActivity,
    checkTimeout,
  };
});
