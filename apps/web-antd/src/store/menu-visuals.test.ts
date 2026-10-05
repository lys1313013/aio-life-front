import { reactive } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMenuVisualsStore } from './menu-visuals';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  user: { userInfo: { id: 'A' } },
}));
vi.mock('@vben/stores', () => ({ useUserStore: () => mocks.user }));
vi.mock('#/api/core/menu-visuals', () => ({ getMenuVisuals: mocks.get }));
const reading = {
  menuId: '9007199254740993',
  icon: 'lucide:book-open',
  iconColor: '#123456',
};
const data = { menus: [reading], cards: { 'section.reading': reading } };
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mocks.user = reactive({ userInfo: { id: 'A' } });
  mocks.get.mockResolvedValue(data);
});

describe('菜单视觉共享快照', () => {
  it('卡片和快捷入口使用同一菜单，修改图标颜色及清空颜色同时生效', async () => {
    const store = useMenuVisualsStore();
    await Promise.all([store.load(), store.load()]);
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(store.visual('section.reading')).toEqual(
      store.menuVisual(reading.menuId),
    );
    const changed = {
      ...reading,
      icon: 'lucide:library',
      iconColor: '#abcdef',
    };
    mocks.get.mockResolvedValue({
      menus: [changed],
      cards: { 'section.reading': changed },
    });
    await store.load(true);
    expect(store.visual('section.reading')).toEqual({
      icon: 'lucide:library',
      iconColor: '#abcdef',
    });
    expect(store.menuVisual(reading.menuId)).toEqual(
      store.visual('section.reading'),
    );
    changed.iconColor = '';
    await store.load(true);
    expect(store.visual('section.reading').iconColor).toBeUndefined();
  });
  it('导航刷新按同一授权菜单快照更新图标颜色，避免菜单与卡片版本不一致', async () => {
    const store = useMenuVisualsStore();
    await store.load();
    store.syncMenus([
      {
        menuId: reading.menuId,
        path: '/record/read',
        icon: 'lucide:library',
        iconColor: '#abcdef',
      },
    ]);
    expect(store.visual('section.reading')).toEqual({
      icon: 'lucide:library',
      iconColor: '#abcdef',
    });
    expect(store.menuVisual(reading.menuId)).toEqual(
      store.visual('section.reading'),
    );
  });
  it('失败保留最后配置，重试可恢复，切换用户丢弃旧请求', async () => {
    const store = useMenuVisualsStore();
    await store.load();
    mocks.get.mockRejectedValueOnce(new Error('network'));
    await store.load(true);
    expect(store.visual('section.reading').iconColor).toBe('#123456');
    expect(store.error).toBe('network');
    let finish!: (value: typeof data) => void;
    mocks.get.mockReturnValueOnce(
      new Promise((done) => {
        finish = done;
      }),
    );
    const pending = store.load(true);
    mocks.user.userInfo.id = 'B';
    finish(data);
    await pending;
    expect(store.ready).toBe(false);
    expect(store.visual('section.reading').icon).toBe(
      'lucide:layout-dashboard',
    );
    await store.load();
    expect(store.error).toBe('');
    expect(store.ready).toBe(true);
  });
});
