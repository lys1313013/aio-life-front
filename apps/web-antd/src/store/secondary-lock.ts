import { onScopeDispose, ref } from 'vue';

import { defineStore } from 'pinia';

import {
  getSecondaryLockMenusApi,
  saveSecondaryLockMenusApi,
} from '#/api/core/auth';

// 后端授权有效期为 30 分钟，前端提前一分钟收起受保护内容。
const UNLOCK_TTL_MS = 29 * 60 * 1000;

/**
 * 用户级二级锁状态管理。
 */
export const useSecondaryLockStore = defineStore('secondary-lock', () => {
  /** 用户锁定的菜单 ID 集合（从后端加载） */
  const lockedMenuIds = ref<Set<string>>(new Set());

  /** 已加载过锁定菜单列表 */
  const loaded = ref(false);

  /** 当前会话已解锁的菜单路径 */
  const unlockedPaths = ref<Set<string>>(new Set());

  const unlockTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const unlockVersions = new Map<string, symbol>();

  function clearUnlockedPaths() {
    for (const timer of unlockTimers.values()) clearTimeout(timer);
    unlockTimers.clear();
    unlockVersions.clear();
    unlockedPaths.value = new Set();
  }

  onScopeDispose(clearUnlockedPaths);

  /** 待解锁后跳转的目标路径 */
  const pendingTargetPath = ref<null | string>(null);

  /** 路由守卫触发时跳转；接口触发时保留当前页面。 */
  const navigateAfterUnlock = ref(true);

  /** 是否显示解锁弹窗 */
  const showModal = ref(false);

  async function loadLockedMenus() {
    if (loaded.value) return;
    try {
      const ids = await getSecondaryLockMenusApi();
      // 后端 Long 序列化为字符串，保留完整 ID。
      lockedMenuIds.value = new Set(ids);
      loaded.value = true;
    } catch {
      // ignore
    }
  }

  async function saveLockedMenus(ids: string[], secondaryPassword: string) {
    const uniqueIds = [...new Set(ids.map(String))];
    await saveSecondaryLockMenusApi({ menuIds: uniqueIds, secondaryPassword });
    lockedMenuIds.value = new Set(uniqueIds);
  }

  function isMenuLocked(menuId: string): boolean {
    return lockedMenuIds.value.has(String(menuId));
  }

  function isUnlocked(menuPath: string): boolean {
    return unlockedPaths.value.has(menuPath);
  }

  function unlock(menuPath: string) {
    const previousTimer = unlockTimers.get(menuPath);
    if (previousTimer !== undefined) clearTimeout(previousTimer);
    const version = Symbol(menuPath);
    unlockVersions.set(menuPath, version);
    unlockTimers.set(
      menuPath,
      setTimeout(() => {
        // 已排入任务队列的旧定时器不能撤销后来获得的授权。
        if (unlockVersions.get(menuPath) !== version) return;
        unlockTimers.delete(menuPath);
        unlockVersions.delete(menuPath);
        unlockedPaths.value.delete(menuPath);
      }, UNLOCK_TTL_MS),
    );
    unlockedPaths.value.add(menuPath);
    showModal.value = false;
  }

  function triggerUnlock(targetPath: string, navigate = true) {
    if (showModal.value) return;
    navigateAfterUnlock.value = navigate;
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
    clearUnlockedPaths();
    navigateAfterUnlock.value = true;
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
    navigateAfterUnlock,
    saveLockedMenus,
    showModal,
    triggerUnlock,
    unlock,
    unlockedPaths,
  };
});
