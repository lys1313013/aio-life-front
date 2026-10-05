import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshNavigation } from './navigation';

const state = vi.hoisted(() => ({
  get: vi.fn(),
  generate: vi.fn(),
  access: {
    isAccessChecked: true,
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setIsAccessChecked: vi.fn(),
  },
}));
vi.mock('#/store/menu-visuals', () => ({
  useMenuVisualsStore: () => ({
    load: vi.fn(),
    syncMenus: vi.fn(),
    loading: false,
    visual: () => ({ icon: 'lucide:layout-dashboard' }),
  }),
}));
vi.mock('@vben/stores', () => ({ useAccessStore: () => state.access }));
vi.mock('#/api/core/menu', () => ({ getMenuPreferencesApi: state.get }));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    loadLockedMenus: async () => {},
    isMenuLocked: (id: string) => id === '9007199254740993',
  }),
}));
vi.mock('./access', () => ({ generateAccess: state.generate }));
vi.mock('./routes', () => ({
  routes: [{ name: 'Root', path: '/', component: {}, children: [] }],
}));

function routerWithOldPage() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        name: 'Root',
        path: '/',
        component: {},
        children: [{ name: 'Old', path: '/old', component: {} }],
      },
    ],
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  state.access.isAccessChecked = true;
  state.get.mockResolvedValue({ hiddenMenuIds: ['hidden'] });
  state.generate.mockImplementation(async ({ router }) => {
    const routes = [
      {
        name: 'Hidden',
        path: '/hidden',
        component: {},
        meta: { menuId: 'hidden', title: 'Hidden' },
      },
      {
        name: 'Locked',
        path: '/locked',
        component: {},
        meta: { menuId: '9007199254740993', title: 'Locked' },
      },
    ];
    const { generateAccessible } = await import('@vben/access');
    return generateAccessible('frontend', { router, routes, roles: ['admin'] });
  });
});
describe('应用导航快照', () => {
  it('刷新保持隐藏偏好和大整数锁标记，并移除旧授权路由', async () => {
    const router = routerWithOldPage();
    await refreshNavigation({ router, routes: [], roles: ['admin'] });
    expect(router.hasRoute('Old')).toBe(false);
    expect(router.resolve('/locked').matched.map((r) => r.name)).toEqual([
      'Root',
      'Locked',
    ]);
    expect(router.hasRoute('Hidden')).toBe(true);
    expect(state.access.setAccessMenus).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Locked',
        path: '/locked',
        menuId: '9007199254740993',
        secondaryLock: true,
      }),
    ]);
  });
  it.each(['menu', 'preferences'])(
    '%s 请求失败保留旧路由与 store',
    async (failure) => {
      const router = routerWithOldPage();
      if (failure === 'menu')
        state.generate.mockRejectedValueOnce(new Error('offline'));
      else state.get.mockRejectedValueOnce(new Error('offline'));
      await expect(
        refreshNavigation({ router, routes: [], roles: [] }),
      ).rejects.toThrow('offline');
      expect(router.hasRoute('Old')).toBe(true);
      expect(router.hasRoute('Locked')).toBe(false);
      expect(state.access.setAccessMenus).not.toHaveBeenCalled();
      expect(state.access.setIsAccessChecked).not.toHaveBeenCalled();
    },
  );
  it('首次偏好读取失败仍可进入默认导航', async () => {
    state.access.isAccessChecked = false;
    state.get.mockRejectedValueOnce(new Error('offline'));
    await refreshNavigation({
      router: routerWithOldPage(),
      routes: [],
      roles: [],
    });
    expect(state.access.setAccessMenus.mock.calls[0]![0]).toHaveLength(2);
  });
  it('并发刷新只提交最新请求的导航快照', async () => {
    const router = routerWithOldPage();
    let complete!: (value: { hiddenMenuIds: string[] }) => void;
    state.get.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const old = refreshNavigation({ router, routes: [], roles: [] });
    await refreshNavigation({ router, routes: [], roles: [] });
    complete({ hiddenMenuIds: [] });
    await old;
    expect(state.access.setAccessMenus).toHaveBeenCalledTimes(1);
    expect(state.access.setAccessMenus.mock.calls[0]![0]).toHaveLength(1);
  });
});
