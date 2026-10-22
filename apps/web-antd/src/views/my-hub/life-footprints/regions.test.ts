import type { SystemRegion } from '#/api/core/system-region';

import { describe, expect, it } from 'vitest';

import { regionAddress, regionCity, regionName } from './regions';

const beijing: SystemRegion[] = [
  { code: '11', name: '北京市', level: 1, hasChildren: true },
  { code: '1101', name: '市辖区', level: 2, hasChildren: true },
  { code: '110101', name: '东城区', level: 3, hasChildren: true },
  { code: '110101001', name: '东华门街道', level: 4, hasChildren: false },
];
describe('地区上下文', () => {
  it('去掉直辖市分组名，地址带真实层级并避免重复省名前缀', () => {
    expect(regionName(beijing)).toBe('北京市东城区东华门街道');
    expect(regionCity(beijing)).toBe('北京市');
    expect(regionAddress(beijing, ' 景山前街1号 ')).toBe(
      '北京市东城区东华门街道景山前街1号',
    );
    expect(regionAddress(beijing, '北京市东城区景山前街1号')).toBe(
      '北京市东城区景山前街1号',
    );
    expect(regionAddress([], '海外手填地址')).toBe('海外手填地址');
  });
  it('允许只选省和县级直管地区，不把统计分组名当城市', () => {
    const path: SystemRegion[] = [
      { code: '46', name: '海南省', level: 1, hasChildren: true },
      { code: '4690', name: '省直辖县级行政区划', level: 2, hasChildren: true },
      { code: '469001', name: '五指山市', level: 3, hasChildren: true },
    ];
    expect(regionName(path)).toBe('海南省五指山市');
    expect(regionCity(path)).toBe('海南省');
    expect(regionName(beijing.slice(0, 1))).toBe('北京市');
    expect(regionCity([])).toBeNull();
  });
});
