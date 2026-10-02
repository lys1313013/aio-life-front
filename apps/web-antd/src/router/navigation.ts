import type { Router } from 'vue-router';

import type { GenerateMenuAndRoutesOptions } from '@vben/types';

import { createMemoryHistory, createRouter } from 'vue-router';

import { useAccessStore } from '@vben/stores';
import { cloneDeep, resetStaticRoutes } from '@vben/utils';

import { getMenuPreferencesApi } from '#/api/core/menu';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { visibleNavigationMenus } from '#/utils/navigation-menus';

import { generateAccess } from './access';
import { routes as baseRoutes } from './routes';

const generations = new WeakMap<Router, number>();

/** 先在隔离 router 中生成完整快照；远端失败不破坏当前可用导航。 */
export async function refreshNavigation(options: GenerateMenuAndRoutesOptions) {
  const generation = (generations.get(options.router) ?? 0) + 1;
  generations.set(options.router, generation);
  const access = useAccessStore();
  const locks = useSecondaryLockStore();
  const draft = createRouter({
    history: createMemoryHistory(),
    routes: cloneDeep(baseRoutes),
  });
  const [{ accessibleMenus, accessibleRoutes }, preference] = await Promise.all(
    [
      generateAccess({ ...options, router: draft }),
      getMenuPreferencesApi().catch((error: unknown) => {
        // 首次登录允许退回默认显示；已有导航刷新失败则保留当前快照。
        if (access.isAccessChecked) throw error;
        return { hiddenMenuIds: [] };
      }),
      locks.loadLockedMenus(),
    ],
  );
  if (generations.get(options.router) !== generation) return;
  const menus = visibleNavigationMenus(
    accessibleMenus,
    preference.hiddenMenuIds,
    locks,
  );
  const root = draft.getRoutes().find((route) => route.name === 'Root');
  if (!root) throw new Error('导航缺少基础布局');

  // 此后没有异步等待；路由已在 draft 中验证，菜单与授权状态一并提交。
  resetStaticRoutes(options.router, baseRoutes);
  options.router.addRoute(root);
  for (const route of accessibleRoutes) {
    if (route.meta?.noBasicLayout) options.router.addRoute(route);
  }
  access.setAccessMenus(menus);
  access.setAccessRoutes(accessibleRoutes);
  access.setIsAccessChecked(true);
  return { accessibleMenus: menus, accessibleRoutes };
}
