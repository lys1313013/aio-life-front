import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRegionChildren, getRegionPath } from '#/api/core/system-region';

import { resolveLocationRegion } from './location-region';

vi.mock('#/api/core/system-region', () => ({
  getRegionChildren: vi.fn(),
  getRegionPath: vi.fn(),
}));

const district = {
  code: '110101',
  name: '东城区',
  level: 3 as const,
  hasChildren: true,
};
const town = {
  code: '110101001',
  name: '东华门街道',
  level: 4 as const,
  hasChildren: false,
};
const region = {
  districtCode: '110101',
  townCode: '110101001',
  townName: '东华门街道',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRegionPath).mockResolvedValue([district]);
  vi.mocked(getRegionChildren).mockResolvedValue([town]);
});

describe('选点地区匹配', () => {
  it('优先使用目录内编码，也支持腾讯乡镇名称和百度编码版本差异', async () => {
    expect(await resolveLocationRegion(region)).toEqual([district, town]);
    expect(await resolveLocationRegion({ ...region, townCode: null })).toEqual([
      district,
      town,
    ]);
    expect(
      await resolveLocationRegion({ ...region, townCode: '110101001000' }),
    ).toEqual([district, town]);
    expect(getRegionChildren).toHaveBeenCalledWith('110101');
  });
  it('缺少乡镇、不匹配或重名时保留区县，不猜测其他街道', async () => {
    expect(
      await resolveLocationRegion({ ...region, townCode: null, townName: '' }),
    ).toEqual([district]);
    expect(getRegionChildren).not.toHaveBeenCalled();
    expect(
      await resolveLocationRegion({
        ...region,
        townCode: null,
        townName: '未知街道',
      }),
    ).toEqual([district]);
    vi.mocked(getRegionChildren).mockResolvedValue([
      town,
      { ...town, code: '110101002' },
    ]);
    expect(await resolveLocationRegion({ ...region, townCode: null })).toEqual([
      district,
    ]);
  });
  it('乡镇请求失败保留已识别区县，缺少有效区划信息时不查询', async () => {
    vi.mocked(getRegionChildren).mockRejectedValue(new Error('network'));
    expect(await resolveLocationRegion(region)).toEqual([district]);
    vi.clearAllMocks();
    expect(await resolveLocationRegion(null)).toEqual([]);
    expect(
      await resolveLocationRegion({ ...region, districtCode: '0' }),
    ).toEqual([]);
    expect(getRegionPath).not.toHaveBeenCalled();
  });
});
