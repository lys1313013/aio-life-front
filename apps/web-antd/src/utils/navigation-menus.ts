import type { MenuRecordRaw } from '@vben/types';

import { mapTree } from '@vben/utils';

import { filterVisibleMenus } from './menu-visibility';

/** 应用导航的统一展示规则，完整授权路由不受显示偏好影响。 */
export function visibleNavigationMenus(
  menus: MenuRecordRaw[],
  hiddenMenuIds: string[],
  locks: { isMenuLocked: (id: string) => boolean },
) {
  return mapTree(filterVisibleMenus(menus, hiddenMenuIds), (menu) => ({
    ...menu,
    secondaryLock: menu.menuId != null && locks.isMenuLocked(menu.menuId),
  }));
}
