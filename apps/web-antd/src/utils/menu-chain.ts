import type { Component } from 'vue';

export interface MenuChainItem {
  icon?: Component | string;
  iconColor?: string;
  path: string;
  menuId?: string;
  children?: MenuChainItem[];
}
export function findMenuChain(
  menus: MenuChainItem[],
  paths: string[],
  parents: MenuChainItem[] = [],
  menuId?: string,
): MenuChainItem[] {
  for (const menu of menus) {
    const chain = [...parents, menu];
    if (menuId ? menu.menuId === menuId : paths.includes(menu.path))
      return chain;
    const nested = findMenuChain(menu.children ?? [], paths, chain, menuId);
    if (nested.length > 0) return nested;
  }
  return [];
}
