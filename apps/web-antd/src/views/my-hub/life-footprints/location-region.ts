import type { LocationRegion } from '#/api/core/life-footprints';

import { getRegionChildren, getRegionPath } from '#/api/core/system-region';

/** 用行政区划编码恢复父级，只在所属区县内匹配乡镇，禁止从地址猜测。 */
export async function resolveLocationRegion(region?: LocationRegion | null) {
  if (!region || !/^\d{6}$/.test(region.districtCode)) return [];
  const code = region.districtCode.replace(/(?:0000|00)$/, '');
  const path = await getRegionPath(code);
  const district = path.at(-1);
  if (!district || district.level !== 3 || !district.hasChildren) return path;
  if (!region.townCode && !region.townName) return path;
  // 乡镇目录请求失败仍保留已识别到的省市区县，允许手动重试。
  const towns = await getRegionChildren(district.code).catch(() => []);
  const town = towns.find((item) => item.code === region.townCode);
  if (town) return [...path, town];
  const matches = towns.filter((item) => item.name === region.townName);
  return matches.length === 1 ? [...path, matches[0]!] : path;
}
