import { ref } from 'vue';

import { defineStore } from 'pinia';

/**
 * 二级锁状态管理，记录已解锁的菜单路径。
 */
export const useSecondaryLockStore = defineStore('secondary-lock', () => {
  /** 已解锁的菜单路径集合 */
  const unlockedPaths = ref<Set<string>>(new Set());

  /** 待解锁后跳转的目标路径 */
  const pendingTargetPath = ref<string | null>(null);

  /** 是否显示解锁弹窗 */
  const showModal = ref(false);

  function isUnlocked(menuPath: string): boolean {
    return unlockedPaths.value.has(menuPath);
  }

  function unlock(menuPath: string) {
    unlockedPaths.value.add(menuPath);
    showModal.value = false;
  }

  function triggerUnlock(targetPath: string) {
    pendingTargetPath.value = targetPath;
    showModal.value = true;
  }

  function cancelUnlock() {
    showModal.value = false;
    pendingTargetPath.value = null;
  }

  function $reset() {
    unlockedPaths.value = new Set();
    pendingTargetPath.value = null;
    showModal.value = false;
  }

  return {
    $reset,
    cancelUnlock,
    isUnlocked,
    pendingTargetPath,
    showModal,
    triggerUnlock,
    unlock,
    unlockedPaths,
  };
});
