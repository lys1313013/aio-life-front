import type { RouteRecordRaw } from 'vue-router';

import { createMemoryHistory, createRouter } from 'vue-router';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createRouterGuard } from './guard';
import { coreRoutes } from './routes/core';

const state = vi.hoisted(() => ({
  access: {
    accessToken: '',
    isAccessChecked: false,
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setIsAccessChecked(value: boolean) {
      this.isAccessChecked = value;
    },
  },
  user: { userInfo: { roles: [], homePath: '/' } },
  generateAccess: vi.fn(),
}));

vi.mock('@vben/constants', () => ({ LOGIN_PATH: '/auth/login' }));
vi.mock('@vben/preferences', () => ({
  preferences: {
    app: { defaultHomePath: '/' },
    transition: { progress: false },
  },
}));
vi.mock('@vben/stores', () => ({
  getTabKey: (route: { path: string }) => route.path,
  useAccessStore: () => state.access,
  useUserStore: () => state.user,
  useTabbarStore: () => ({ tabLastActiveTime: new Map() }),
}));
vi.mock('@vben/utils', () => ({
  startProgress: vi.fn(),
  stopProgress: vi.fn(),
}));
vi.mock('#/api/core/menu', () => ({
  getMenuPreferencesApi: async () => ({ hiddenMenuIds: [] }),
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/router/routes', () => ({
  accessRoutes: [],
  coreRouteNames: ['Root', 'Login', 'LegacyHome'],
}));
vi.mock('#/store', () => ({ useAuthStore: () => ({}) }));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({
    loadLockedMenus: async () => {},
    isMenuLocked: () => false,
  }),
}));
vi.mock('#/utils/menu-visibility', () => ({
  filterVisibleMenus: (menus: unknown[]) => menus,
}));
vi.mock('./access', () => ({ generateAccess: state.generateAccess }));

function stubPage(route: RouteRecordRaw): RouteRecordRaw {
  const result = { ...route };
  if ('component' in result) result.component = {};
  if (result.children) {
    result.children = result.children.map((child) => stubPage(child));
  }
  return result;
}

function makeRouter() {
  // 使用实际路由路径和重定向，只替换页面组件以隔离页面 API 请求。
  const router = createRouter({
    history: createMemoryHistory(),
    routes: coreRoutes.map((route) => stubPage(route)),
  });
  state.generateAccess.mockImplementation(async () => {
    router.addRoute('Root', {
      name: 'Analytics',
      path: '/',
      component: {},
      meta: { title: '主页' },
    });
    return { accessibleMenus: [], accessibleRoutes: [] };
  });
  createRouterGuard(router);
  return router;
}

describe('根路径首页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.access.accessToken = '';
    state.access.isAccessChecked = false;
    state.user.userInfo.homePath = '/';
  });

  it('未登录访问根路径仍跳转登录，不放行基础布局', async () => {
    const router = makeRouter();
    await router.push('/');
    expect(router.currentRoute.value.fullPath).toBe('/auth/login');
    expect(state.generateAccess).not.toHaveBeenCalled();
  });

  it('已登录直接访问根路径会加载动态首页并保留基础布局', async () => {
    state.access.accessToken = 'test-token';
    const router = makeRouter();
    await router.push('/');
    expect(state.generateAccess).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe('/');
    expect(
      router.currentRoute.value.matched.map((route) => route.name),
    ).toEqual(['Root', 'Analytics']);
  });

  it('旧书签重定向到根路径并保留查询参数和锚点', async () => {
    state.access.accessToken = 'test-token';
    const router = makeRouter();
    await router.push('/analytics?source=bookmark#today');
    expect(router.currentRoute.value.fullPath).toBe('/?source=bookmark#today');
    expect(router.currentRoute.value.name).toBe('Analytics');
    await router.push('/analytics');
    expect(router.currentRoute.value.fullPath).toBe('/');
  });

  it('登录回跳兼容后端返回的旧 homePath', async () => {
    state.access.accessToken = 'test-token';
    state.user.userInfo.homePath = '/analytics';
    const router = makeRouter();
    await router.push('/auth/login');
    expect(router.currentRoute.value.path).toBe('/');
    expect(router.currentRoute.value.name).toBe('Analytics');
  });
});
