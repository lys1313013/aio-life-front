import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';

import { Button, Checkbox, Popconfirm } from 'ant-design-vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MenuDisplaySetting from './menu-display-setting.vue';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  reset: vi.fn(),
  save: vi.fn(),
  setMenus: vi.fn(),
}));

vi.mock('#/api/core/menu', () => ({
  getMenuPreferencesApi: mocks.get,
  resetMenuPreferencesApi: mocks.reset,
  saveMenuPreferencesApi: mocks.save,
}));
vi.mock('#/locales', () => ({ $t: (text: string) => text }));
vi.mock('@vben/common-ui', () => ({
  VbenIcon: { props: ['icon'], template: '<i :data-icon="icon" />' },
}));
vi.mock('vue-router', () => ({ useRouter: () => ({}) }));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({ accessRoutes: [], setAccessMenus: mocks.setMenus }),
}));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({ isMenuLocked: () => true }),
}));
vi.mock(
  '#/utils/menu-visibility',
  async () => import('../../../utils/menu-visibility'),
);
vi.mock('@vben/utils', async () => {
  const { mapTree } =
    await import('../../../../../../packages/@core/base/shared/src/utils/tree');
  return {
    generateMenus: () => [
      {
        children: [
          {
            icon: 'lucide:activity',
            menuId: '11',
            name: '运动',
            path: '/exercise',
          },
          {
            icon: 'lucide:lightbulb',
            menuId: '12',
            name: '闪念',
            path: '/think',
          },
        ],
        menuId: '10',
        icon: 'lucide:layout-grid',
        name: '记录',
        path: '/record',
      },
    ],
    mapTree,
  };
});

const menus = [
  {
    children: [
      { children: [], id: '11', title: '运动' },
      { children: [], id: '12', title: '闪念' },
    ],
    id: '10',
    title: '记录',
  },
];

enableAutoUnmount(afterEach);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue({ hiddenMenuIds: ['12'], menus });
  mocks.save.mockImplementation(async (ids: string[]) => ({
    hiddenMenuIds: ids,
    menus,
  }));
  mocks.reset.mockResolvedValue({ hiddenMenuIds: [], menus });
});

function saveButton(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAllComponents(Button)
    .find((button) => button.text().replaceAll(/\s/g, '') === '保存')!;
}

function checkbox(wrapper: ReturnType<typeof mount>, title: string) {
  return wrapper
    .findAllComponents(Checkbox)
    .find((item) => item.text() === title)!;
}

describe('菜单显示设置', () => {
  it('深层菜单保留分组路径，勾选只保存末级ID', async () => {
    mocks.get.mockResolvedValueOnce({
      hiddenMenuIds: [],
      menus: [
        {
          id: '1',
          title: '系统',
          children: [
            {
              id: '2',
              title: '子分组',
              children: [
                {
                  id: '9007199254740993',
                  title: '页面',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    });
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    await checkbox(wrapper, '子分组 / 页面').get('input').setValue(false);
    await saveButton(wrapper).trigger('click');
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith(['9007199254740993']);
  });

  it('展示完整分组和隐藏子项，恢复显示后立即重建导航且保留菜单锁', async () => {
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    expect(wrapper.text()).toContain('运动');
    expect(wrapper.text()).toContain('闪念');
    expect(checkbox(wrapper, '运动').props('checked')).toBe(true);
    expect(checkbox(wrapper, '闪念').props('checked')).toBe(false);
    expect(checkbox(wrapper, '记录').props('indeterminate')).toBe(true);
    expect(saveButton(wrapper).props('disabled')).toBe(true);

    await checkbox(wrapper, '闪念').get('input').setValue(true);
    await flushPromises();
    await saveButton(wrapper).trigger('click');
    await flushPromises();

    expect(mocks.save).toHaveBeenCalledWith([]);
    const visible = mocks.setMenus.mock.lastCall?.[0];
    expect(visible[0].children).toHaveLength(2);
    expect(visible[0].children[1].secondaryLock).toBe(true);
  });

  it('分组取消勾选只保存末级ID，父菜单自动消失', async () => {
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    await checkbox(wrapper, '记录').get('input').setValue(true);
    await checkbox(wrapper, '记录').get('input').setValue(false);
    await flushPromises();
    await saveButton(wrapper).trigger('click');
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledWith(['11', '12']);
    expect(mocks.setMenus).toHaveBeenLastCalledWith([]);
  });

  it('保存失败保留勾选且不改导航，可重试', async () => {
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    mocks.save.mockRejectedValueOnce(new Error('failed'));
    await checkbox(wrapper, '记录').get('input').setValue(true);
    await checkbox(wrapper, '记录').get('input').setValue(false);
    await flushPromises();
    const count = mocks.setMenus.mock.calls.length;
    await saveButton(wrapper).trigger('click');
    await flushPromises();
    expect(mocks.setMenus).toHaveBeenCalledTimes(count);
    expect(checkbox(wrapper, '运动').props('checked')).toBe(false);
    expect(checkbox(wrapper, '闪念').props('checked')).toBe(false);
    expect(saveButton(wrapper).props('loading')).toBe(false);
    expect(saveButton(wrapper).props('disabled')).toBe(false);
  });

  it('恢复默认调用物理清理接口并重新勾选全部菜单', async () => {
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    wrapper.getComponent(Popconfirm).vm.$emit('confirm');
    await flushPromises();
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(checkbox(wrapper, '运动').props('checked')).toBe(true);
    expect(checkbox(wrapper, '闪念').props('checked')).toBe(true);
    expect(saveButton(wrapper).props('disabled')).toBe(true);
  });

  it('加载失败时不能保存空设置，重试成功后恢复展示', async () => {
    mocks.get.mockRejectedValueOnce(new Error('failed'));
    const wrapper = mount(MenuDisplaySetting);
    await flushPromises();
    expect(wrapper.text()).toContain('加载失败');
    expect(wrapper.findComponent(Checkbox).exists()).toBe(false);
    expect(mocks.setMenus).not.toHaveBeenCalled();
    await wrapper.getComponent(Button).trigger('click');
    await flushPromises();
    expect(wrapper.findComponent(Checkbox).exists()).toBe(true);
  });
});
