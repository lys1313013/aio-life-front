import type { MenuRecordRaw } from '@vben/types';

/** 只生成展示树，保留原始菜单和路由；所有 ID 按字符串比较。 */
export function filterVisibleMenus(
  menus: MenuRecordRaw[],
  hiddenMenuIds: string[],
): MenuRecordRaw[] {
  const hidden = new Set(hiddenMenuIds);
  function filter(items: MenuRecordRaw[]): MenuRecordRaw[] {
    return items.flatMap((item) => {
      if (item.path !== '/profile' && hidden.has(String(item.menuId))) {
        return [];
      }
      const children = item.children ? filter(item.children) : undefined;
      if (item.children?.length && !children?.length) {
        return [];
      }
      return [{ ...item, children }];
    });
  }
  return filter(menus);
}
