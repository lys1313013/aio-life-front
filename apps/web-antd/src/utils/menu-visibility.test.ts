import type { MenuRecordRaw } from '@vben/types';

import { describe, expect, it } from 'vitest';

import { filterVisibleMenus } from './menu-visibility';

describe('个人菜单显示', () => {
  const menus: MenuRecordRaw[] = [
    {
      children: [
        { menuId: 11, name: '运动', path: '/exercise', secondaryLock: true },
        { menuId: 12, name: '闪念', path: '/think' },
      ],
      menuId: 10,
      name: '记录',
      path: '/record',
    },
    { menuId: 20, name: '个人中心', path: '/profile' },
  ];

  it('隐藏子菜单并保留其他菜单及锁标记，不修改原树', () => {
    const original = JSON.stringify(menus);
    const result = filterVisibleMenus(menus, ['12']);
    expect(result[0]?.children).toHaveLength(1);
    expect(result[0]?.children?.[0]?.secondaryLock).toBe(true);
    expect(JSON.stringify(menus)).toBe(original);
    expect(filterVisibleMenus(menus, [])[0]?.children).toHaveLength(2);
  });

  it('全部子菜单隐藏后移除空分组，个人中心仍可达', () => {
    expect(filterVisibleMenus(menus, ['11', '12', '20'])).toEqual([menus[1]]);
    expect(filterVisibleMenus(menus, ['10'])).toEqual([menus[1]]);
  });

  it('新增菜单默认展示，失效ID不影响其他菜单', () => {
    expect(filterVisibleMenus(menus, ['999'])).toEqual(menus);
  });

  it('嵌套空分组递归移除', () => {
    const nested = [{ name: '上层', path: '/outer', children: [menus[0]!] }];
    expect(filterVisibleMenus(nested, ['11', '12'])).toEqual([]);
  });

  it('按字符串匹配后端雪花ID，不发生数值精度碰撞', () => {
    // 现有共享类型尚为 number，实际 API 中 Long 返回 string。
    const largeIds = [
      { menuId: '9007199254740992', name: 'A', path: '/a' },
      { menuId: '9007199254740993', name: 'B', path: '/b' },
    ] as unknown as MenuRecordRaw[];
    expect(filterVisibleMenus(largeIds, ['9007199254740993'])).toEqual([
      largeIds[0],
    ]);
  });
});
