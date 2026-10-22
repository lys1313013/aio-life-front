import { describe, expect, it } from 'vitest';

import { gcj02ToWgs84, wgs84ToGcj02 } from './coordinates';

describe('足迹地图坐标边界', () => {
  it('wGS84 选点转为 GCJ02，已有 GCJ02 转回 WGS84 展示', () => {
    const wgs = { longitude: 116.404, latitude: 39.915 };
    const gcj = wgs84ToGcj02(wgs);
    expect(gcj.longitude).toBeCloseTo(116.410_244_499, 8);
    expect(gcj.latitude).toBeCloseTo(39.916_404_282, 8);
    expect(gcj02ToWgs84(gcj).longitude).toBeCloseTo(wgs.longitude, 8);
    expect(gcj02ToWgs84(gcj).latitude).toBeCloseTo(wgs.latitude, 8);
    expect(wgs).toEqual({ longitude: 116.404, latitude: 39.915 });
  });

  it('国内多个城市往返转换不累积偏移，境外坐标保持原值', () => {
    for (const point of [
      { longitude: 120.127_128, latitude: 30.273_297 },
      { longitude: 113.2644, latitude: 23.1291 },
      { longitude: 87.6168, latitude: 43.8256 },
      { longitude: 104.0665, latitude: 30.5723 },
    ]) {
      const roundTrip = wgs84ToGcj02(gcj02ToWgs84(point));
      expect(roundTrip.longitude).toBeCloseTo(point.longitude, 8);
      expect(roundTrip.latitude).toBeCloseTo(point.latitude, 8);
    }
    for (const point of [
      { longitude: -0.1276, latitude: 51.5072 },
      { longitude: -74.006, latitude: 40.7128 },
      { longitude: 151.2093, latitude: -33.8688 },
    ]) {
      expect(wgs84ToGcj02(point)).toEqual(point);
      expect(gcj02ToWgs84(point)).toEqual(point);
    }
  });
});
