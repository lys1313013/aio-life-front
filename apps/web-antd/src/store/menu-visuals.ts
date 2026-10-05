import type { MenuVisual, MenuVisuals } from '#/api/core/menu-visuals';

import { computed, ref, watch } from 'vue';

import { useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import { getMenuVisuals } from '#/api/core/menu-visuals';

interface MenuVisualNode {
  menuId?: string;
  path: string;
  icon?: unknown;
  iconColor?: string;
  children?: MenuVisualNode[];
}

export function normalizeMenuVisual(menu?: MenuVisual) {
  return {
    icon:
      typeof menu?.icon === 'string' && menu.icon.trim()
        ? menu.icon.trim()
        : 'lucide:layout-dashboard',
    iconColor: /^#[\da-f]{6}$/i.test(menu?.iconColor || '')
      ? menu!.iconColor!
      : undefined,
  };
}

/** 首页、设置和导航共享当前菜单视觉快照。 */
export const useMenuVisualsStore = defineStore('menu-visuals', () => {
  const user = useUserStore();
  const snapshot = ref<MenuVisuals>({ menus: [], cards: {} });
  const loading = ref(false);
  const ready = ref(false);
  const error = ref('');
  let revision = 0;
  let pending: null | Promise<void> = null;
  const identity = computed(() =>
    String(user.userInfo?.userId || user.userInfo?.id || ''),
  );
  function $reset() {
    revision++;
    pending = null;
    snapshot.value = { menus: [], cards: {} };
    loading.value = ready.value = false;
    error.value = '';
  }
  watch(identity, $reset, { flush: 'sync' });
  function load(force = false): Promise<void> {
    if (pending && !force) return pending;
    if (ready.value && !force) return Promise.resolve();
    const version = ++revision;
    loading.value = true;
    error.value = '';
    const task = (async () => {
      try {
        const data = await getMenuVisuals();
        if (version !== revision) return;
        if (
          !Array.isArray(data?.menus) ||
          !data?.cards ||
          typeof data.cards !== 'object'
        )
          throw new Error('菜单配置异常，请重试');
        snapshot.value = data;
        ready.value = true;
      } catch (error_) {
        if (version === revision)
          error.value = (error_ as Error).message || '加载失败';
      } finally {
        if (version === revision) {
          loading.value = false;
          pending = null;
        }
      }
    })();
    pending = task;
    return task;
  }
  function visual(key: string) {
    return normalizeMenuVisual(snapshot.value.cards[key]);
  }
  function menuVisual(menuId?: string, currentMenu?: MenuVisual) {
    return normalizeMenuVisual(
      snapshot.value.menus.find((menu) => menu.menuId === menuId) ||
        currentMenu,
    );
  }
  function syncMenus(nodes: MenuVisualNode[]) {
    const menus: MenuVisual[] = [];
    function flatten(tree: typeof nodes) {
      for (const node of tree) {
        menus.push({
          menuId: node.menuId,
          path: node.path,
          ...normalizeMenuVisual({
            icon: typeof node.icon === 'string' ? node.icon : undefined,
            iconColor: node.iconColor,
          }),
        });
        flatten(node.children || []);
      }
    }
    flatten(nodes);
    const byId = new Map(menus.map((menu) => [menu.menuId, menu]));
    snapshot.value = {
      menus,
      cards: Object.fromEntries(
        Object.entries(snapshot.value.cards).map(([key, source]) => [
          key,
          source.menuId ? byId.get(source.menuId) || {} : source,
        ]),
      ),
    };
  }
  return {
    $reset,
    snapshot,
    loading,
    ready,
    error,
    load,
    visual,
    menuVisual,
    syncMenus,
    cardMenu: (key: string) => snapshot.value.cards[key],
  };
});
