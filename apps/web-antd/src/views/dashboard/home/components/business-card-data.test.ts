import type { MembershipVO } from '#/api/membership';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  dateDistance,
  findMenuChain,
  hasMoreRecords,
  requirePinnedRows,
  sortMemberships,
} from './business-card-data';

afterEach(() => {
  vi.useRealTimers();
});
describe('业务首页数据规则', () => {
  it('分页总数按字符串处理，支持大整数，空页停止并拒绝非法总数', () => {
    expect(hasMoreRecords('0', 1, 20, 0)).toBe(false);
    expect(hasMoreRecords('21', 1, 20, 20)).toBe(true);
    expect(hasMoreRecords('21', 2, 20, 1)).toBe(false);
    expect(hasMoreRecords('9007199254740993', 1, 20, 20)).toBe(true);
    expect(hasMoreRecords('100', 2, 20, 0)).toBe(false);
    expect(() => hasMoreRecords('', 1, 20, 20)).toThrow();
  });
  it('会员排除过期，今天到期仍保留，到期日近到远且同日按完整ID排序', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T12:00:00'));
    const rows = [
      ['1', '2026-10-01'],
      ['2', '2026-09-01'],
      ['3', '2026-11-01'],
      ['4', '2026-10-04'],
      ['9007199254740992', '2026-10-05'],
      ['9007199254740993', '2026-10-05'],
    ].map(([id, expiryDate]) => ({ id, expiryDate }) as MembershipVO);
    expect(sortMemberships(rows).map((row) => row.id)).toEqual([
      '4',
      '9007199254740993',
      '9007199254740992',
      '3',
    ]);
    expect(
      sortMemberships([
        {
          id: '5',
          expiryDate: '2026-10-05',
          status: 'expired',
        } as MembershipVO,
      ]),
    ).toEqual([]);
    expect(rows).toHaveLength(6);
    expect(dateDistance('2026-10-04')).toBe('就是今天');
    expect(dateDistance('2026-10-01')).toBe('已经 3 天');
    expect(dateDistance('2026-10-01', true)).toBe('已过期 3 天');
    expect(dateDistance('2026-10-05', true)).toBe('还有 1 天');
  });
  it('权限检查保留业务菜单的祖先链，并拒绝未升级的固定接口', () => {
    const root = {
      path: '/record',
      menuId: '9007199254740993',
      children: [{ path: '/record/read', menuId: '9007199254740994' }],
    };
    expect(
      findMenuChain([root], ['/record/read']).map((menu) => menu.path),
    ).toEqual(['/record', '/record/read']);
    expect(findMenuChain([root], ['/membership'])).toEqual([]);
    expect(() => requirePinnedRows([{}])).toThrow('Home pin API is not ready');
    expect(requirePinnedRows([{ isPinned: 0 }, { isPinned: 1 }])).toEqual([
      { isPinned: 1 },
    ]);
  });
});
