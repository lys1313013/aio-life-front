import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import {
  getTabKey,
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';
import { useSecondaryLockStore } from '#/store/secondary-lock';

import { refreshNavigation } from './navigation';

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 基本路由，这些路由不需要进入权限拦截
    // 根路径首次访问时仍需鉴权并加载动态首页，不能按基础布局直接放行。
    if (to.name !== 'Root' && coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      // 二级锁检查
      const secondaryLockStore = useSecondaryLockStore();
      const menuId = to.meta.menuId;
      if (menuId != null && secondaryLockStore.isMenuLocked(menuId)) {
        const menuPath = to.path;
        if (!secondaryLockStore.isUnlocked(menuPath)) {
          secondaryLockStore.triggerUnlock(menuPath);
          // 硬刷新直接访问被锁菜单时不能 return false（会停在无匹配路由导致白屏），
          // 跳默认首页，正常渲染并弹出解锁弹窗。
          return from.fullPath
            ? false
            : { path: preferences.app.defaultHomePath };
        }
      }
      return true;
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    const userInfo = userStore.userInfo || (await authStore.fetchUserInfo());
    const userRoles = userInfo.roles ?? [];

    await refreshNavigation({ roles: userRoles, router, routes: accessRoutes });
    const secondaryLockStore = useSecondaryLockStore();
    const redirectPath = (from.query.redirect ??
      (to.fullPath === preferences.app.defaultHomePath
        ? userInfo.homePath || preferences.app.defaultHomePath
        : to.fullPath)) as string;

    // 目标菜单被二级锁锁定：先弹出解锁弹窗，并跳默认首页。
    // 不能把被锁目标作为守卫返回的 location —— 会先路由到该目标再触发二级锁的二次递归导航，导致白屏卡死。
    const target = router.resolve(decodeURIComponent(redirectPath));
    const targetMenuId = target.meta?.menuId;
    if (targetMenuId != null && secondaryLockStore.isMenuLocked(targetMenuId)) {
      secondaryLockStore.triggerUnlock(target.path);
      return { path: preferences.app.defaultHomePath };
    }

    return {
      ...target,
      replace: true,
    };
  });
}

/**
 * 标签页自动刷新守卫
 * @param router
 */
function setupTabGuard(router: Router) {
  router.afterEach((to, from) => {
    const tabbarStore = useTabbarStore();

    // 1. 记录离开页面的最后活跃时间
    if (from && from.name) {
      tabbarStore.tabLastActiveTime.set(getTabKey(from), Date.now());
    }

    // 2. 检查进入页面是否需要刷新
    const { maxIdleTime } = to.meta;
    const tabKey = getTabKey(to);

    if (maxIdleTime && maxIdleTime > 0) {
      const lastActiveTime = tabbarStore.tabLastActiveTime.get(tabKey);
      if (
        lastActiveTime &&
        (Date.now() - lastActiveTime) / 1000 > maxIdleTime
      ) {
        // 超过空闲时间，触发刷新
        tabbarStore.refresh(router);
      }
    }
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
  /** 标签页自动刷新 */
  setupTabGuard(router);
}

export { createRouterGuard };
