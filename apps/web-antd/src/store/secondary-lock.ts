import { ref } from 'vue';

import { defineStore } from 'pinia';

import { getSecondaryLockMenusApi, saveSecondaryLockMenusApi } from '#/api/core/auth';

/**
 * 用户级二级锁状态管理。
 */
export const useSecondaryLockStore = defineStore('secondary-lock', () => {
  /** 用户锁定的菜单 ID 集合（从后端加载） */
  const lockedMenuIds = ref<Set<number>>(new Set());

  /** 已加载过锁定菜单列表 */
  const loaded = ref(false);

  /** 当前会话已解锁的菜单路径 */
  const unlockedPaths = ref<Set<string>>(new Set());

  /** 待解锁后跳转的目标路径 */
  const pendingTargetPath = ref<string | null>(null);

  /** 是否显示解锁弹窗 */
  const showModal = ref(false);

  async function loadLockedMenus() {
    if (loaded.value) return;
    try {
      const ids = await getSecondaryLockMenusApi();
      // 后端 Long 序列化为字符串，统一转 number 存储
      lockedMenuIds.value = new Set(ids.map(Number));
    } catch {
      // ignore
    } finally {
      loaded.value = true;
    }
  }

  async function saveLockedMenus(ids: number[], secondaryPassword: string) {
    const uniqueIds = [...new Set(ids)];
    await saveSecondaryLockMenusApi({ menuIds: uniqueIds, secondaryPassword });
    lockedMenuIds.value = new Set(uniqueIds);
  }

  function isMenuLocked(menuId: number | string): boolean {
    return lockedMenuIds.value.has(Number(menuId));
  }

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
    lockedMenuIds.value = new Set();
    loaded.value = false;
    unlockedPaths.value = new Set();
    pendingTargetPath.value = null;
    showModal.value = false;
  }

  return {
    $reset,
    cancelUnlock,
    isMenuLocked,
    isUnlocked,
    loadLockedMenus,
    lockedMenuIds,
    loaded,
    pendingTargetPath,
    saveLockedMenus,
    showModal,
    triggerUnlock,
    unlock,
    unlockedPaths,
  };
});
