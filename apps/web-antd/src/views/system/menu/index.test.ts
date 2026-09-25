import type { SysMenuAdminItem } from '#/api/core/menu';

import { flushPromises, shallowMount } from '@vue/test-utils';

import { message, Popconfirm, Switch, Table, Tree } from 'ant-design-vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MenuPage from './index.vue';

const api = vi.hoisted(() => ({
  getMenuAdminTreeApi: vi.fn(),
  getMenuRoleOptionsApi: vi.fn(async () => []),
  createMenuApi: vi.fn(),
  updateMenuApi: vi.fn(),
  updateMenuStatusApi: vi.fn(),
  updateMenuSortApi: vi.fn(),
  deleteMenuApi: vi.fn(),
}));
vi.mock('#/api/core/menu', () => api);
vi.mock('@vben/common-ui', () => ({ VbenIcon: { template: '<span />' } }));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({
    setAccessMenus: vi.fn(),
    setAccessRoutes: vi.fn(),
    setIsAccessChecked: vi.fn(),
  }),
  useUserStore: () => ({ userInfo: { roles: ['admin'] } }),
}));
vi.mock('#/store', () => ({ useAuthStore: () => ({}) }));
vi.mock('#/router', () => ({ resetRoutes: vi.fn(), router: {} }));
vi.mock('#/router/routes', () => ({ accessRoutes: [] }));
vi.mock('#/router/access', () => ({
  generateAccess: async () => ({ accessibleMenus: [], accessibleRoutes: [] }),
}));

const parentId = '90071992547409930';
function menu(id: string, parent = '0', sort = 0): SysMenuAdminItem {
  return { id, parentId: parent, name: id, path: `/${id}`, sort, status: 1 };
}
function fixture(): SysMenuAdminItem[] {
  return [
    {
      ...menu(parentId),
      children: [
        {
          ...menu('child-a', parentId, 3),
          children: [menu('grandchild', 'child-a')],
        },
        menu('child-b', parentId, 3),
      ],
    },
    menu('other-root'),
  ];
}

const wrappers: ReturnType<typeof shallowMount>[] = [];
async function mountPage() {
  const wrapper = shallowMount(MenuPage, {
    global: {
      renderStubDefaultSlot: true,
      stubs: {
        AModal: { template: '<div />' },
        APopconfirm: {
          emits: ['confirm'],
          template: '<div><slot /></div>',
        },
        ATable: {
          props: ['dataSource', 'expandedRowKeys'],
          template: `<div>
            <div v-for="record in dataSource" :key="record.id">
              <slot name="bodyCell" :column="{ key: 'status' }" :record="record" />
              <slot name="bodyCell" :column="{ key: 'action' }" :record="record" />
            </div>
          </div>`,
        },
        AButton: {
          emits: ['click'],
          template: '<button @click="$emit(\'click\')"><slot /></button>',
        },
        ATree: {
          inheritAttrs: false,
          props: [
            'treeData',
            'selectedKeys',
            'expandedKeys',
            'draggable',
            'allowDrop',
          ],
          emits: ['select', 'drop', 'update:expandedKeys'],
          template: '<div />',
        },
      },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
async function select(wrapper: ReturnType<typeof shallowMount>, id: string) {
  wrapper.findComponent(Tree).vm.$emit('select', [id], { node: { key: id } });
  await wrapper.vm.$nextTick();
}
function drop(wrapper: ReturnType<typeof shallowMount>, target = 'child-a') {
  wrapper.findComponent(Tree).vm.$emit('drop', {
    dragNode: { key: 'child-b' },
    node: { key: target, pos: '0-0-0' },
    dropPosition: -1,
    dropToGap: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(message, 'success').mockImplementation(vi.fn());
  api.getMenuAdminTreeApi.mockImplementation(async () => fixture());
  api.updateMenuSortApi.mockImplementation(async () => ({}));
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('菜单树与明细联动', () => {
  it('表格常驻，初始为空，选父节点显示自身及子树，选叶子只显示自身', async () => {
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Table).exists()).toBe(true);
    expect(wrapper.findComponent(Table).props('dataSource')).toEqual([]);
    await select(wrapper, parentId);
    const table = wrapper.findComponent(Table);
    expect(table.props('dataSource')).toEqual([fixture()[0]]);
    expect(table.props('expandedRowKeys')).toContain(parentId);
    expect(table.props('expandedRowKeys')).not.toContain('child-a');
    await select(wrapper, 'grandchild');
    expect(table.props('dataSource')).toEqual([menu('grandchild', 'child-a')]);
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(1);
  });

  it('菜单接口返回空列表时仍保留表格', async () => {
    api.getMenuAdminTreeApi.mockResolvedValueOnce([]);
    const wrapper = await mountPage();
    expect(wrapper.findComponent(Table).exists()).toBe(true);
    expect(wrapper.findComponent(Table).props('dataSource')).toEqual([]);
  });

  it('展开和折叠菜单树不改变右侧选中节点', async () => {
    const wrapper = await mountPage();
    await select(wrapper, parentId);
    await wrapper.get('[aria-label="全部展开"]').trigger('click');
    expect(wrapper.findComponent(Tree).props('expandedKeys')).toEqual([
      parentId,
      'child-a',
    ]);
    await wrapper.get('[aria-label="全部折叠"]').trigger('click');
    expect(wrapper.findComponent(Tree).props('expandedKeys')).toEqual([]);
    expect(wrapper.findComponent(Table).props('dataSource')?.[0]?.id).toBe(
      parentId,
    );
  });

  it('同级节点排序值重复时仍能交换，并保留后代和选中状态', async () => {
    const wrapper = await mountPage();
    await select(wrapper, parentId);
    drop(wrapper);
    await flushPromises();
    expect(api.updateMenuSortApi).toHaveBeenCalledWith('child-a', 4);
    const parent = wrapper.findComponent(Table).props('dataSource')?.[0];
    expect(parent?.children?.map((item: SysMenuAdminItem) => item.id)).toEqual([
      'child-b',
      'child-a',
    ]);
    expect(parent?.children?.[1]?.children?.[0]?.id).toBe('grandchild');
    expect(wrapper.findComponent(Tree).props('selectedKeys')).toEqual([
      parentId,
    ]);
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(1);
  });

  it('拒绝跨父节点拖动，不发送排序请求', async () => {
    const wrapper = await mountPage();
    drop(wrapper, 'other-root');
    await flushPromises();
    expect(api.updateMenuSortApi).not.toHaveBeenCalled();
  });

  it('启停父节点使用接口返回值局部更新，不丢失子菜单', async () => {
    const wrapper = await mountPage();
    await select(wrapper, parentId);
    api.updateMenuStatusApi.mockResolvedValue({ ...menu(parentId), status: 0 });
    wrapper.findComponent(Switch).vm.$emit('change', false);
    await flushPromises();
    const parent = wrapper.findComponent(Table).props('dataSource')?.[0];
    expect(parent?.status).toBe(0);
    expect(parent?.children).toHaveLength(2);
    expect(parent?.children?.[0]?.children?.[0]?.id).toBe('grandchild');
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent(Tree).props('selectedKeys')).toEqual([
      parentId,
    ]);
  });

  it('删除选中的叶子节点后返回父节点，并从树中移除该菜单', async () => {
    const wrapper = await mountPage();
    await select(wrapper, 'child-b');
    api.deleteMenuApi.mockResolvedValue(undefined);
    wrapper.findComponent(Popconfirm).vm.$emit('confirm');
    await flushPromises();
    expect(api.deleteMenuApi).toHaveBeenCalledWith('child-b');
    expect(wrapper.findComponent(Tree).props('selectedKeys')).toEqual([
      parentId,
    ]);
    const parent = wrapper.findComponent(Table).props('dataSource')?.[0];
    expect(parent?.children?.map((item: SysMenuAdminItem) => item.id)).toEqual([
      'child-a',
    ]);
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(1);
  });

  it('排序部分失败时等待所有请求结束后恢复服务端数据', async () => {
    api.getMenuAdminTreeApi.mockImplementation(async () => {
      const data = fixture();
      data[0]!.children![1]!.sort = 8;
      return data;
    });
    let finish: (() => void) | undefined;
    api.updateMenuSortApi.mockImplementation(async (id: string) => {
      if (id === 'child-b') throw new Error('test failure');
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return {};
    });
    const wrapper = await mountPage();
    await select(wrapper, parentId);
    drop(wrapper);
    await flushPromises();
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(1);
    finish?.();
    await flushPromises();
    expect(api.getMenuAdminTreeApi).toHaveBeenCalledTimes(2);
    expect(
      wrapper.findComponent(Table).props('dataSource')?.[0]?.children?.[0]?.id,
    ).toBe('child-a');
    expect(wrapper.findComponent(Tree).props('selectedKeys')).toEqual([
      parentId,
    ]);
  });
});
