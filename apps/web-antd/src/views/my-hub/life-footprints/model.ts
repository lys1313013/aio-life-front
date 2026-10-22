/** 结束日期的特殊值；界面展示为“至今”。 */
import type { MapTileSource, TencentMapConfig } from './map-config';

export const PRESENT_DATE = '9999-12-31';

export interface Coordinate {
  longitude: number;
  latitude: number;
}
export interface FootprintRequest extends Coordinate {
  startDate: string;
  endDate: string;
  placeName: string;
  address: null | string;
  city: null | string;
  regionCode?: null | string;
  coordinateSystem: 'GCJ02';
  providerUid: null | string;
  note: null | string;
}
export interface Footprint extends FootprintRequest {
  id: string;
}
export interface LocationResult extends Coordinate {
  placeName: string;
  address: string;
  city: string;
  coordinateSystem: 'GCJ02';
  providerUid: null | string;
  precise: boolean;
  level: string;
}
export interface MapConfig {
  tiles?: MapTileSource;
  tencent?: TencentMapConfig;
  searchEnabled: boolean;
  coordinateSystem: 'GCJ02';
}
export interface Draft extends Omit<
  FootprintRequest,
  'latitude' | 'longitude'
> {
  id: null | string;
  latitude: null | number;
  longitude: null | number;
  confirmed: boolean;
}
export interface LocationGroup extends Coordinate {
  key: string;
  records: Footprint[];
}

export function emptyDraft(): Draft {
  return {
    id: null,
    startDate: '',
    endDate: PRESENT_DATE,
    placeName: '',
    address: null,
    city: null,
    regionCode: null,
    latitude: null,
    longitude: null,
    coordinateSystem: 'GCJ02',
    providerUid: null,
    note: null,
    confirmed: false,
  };
}

/** 完整日历日期，与 MySQL DATE 的年份范围一致。 */
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1000 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (days[month - 1] ?? 0)
  );
}

export function draftPayload(draft: Draft): FootprintRequest {
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  if (!validDate(startDate) || !validDate(endDate))
    throw new Error('请填写有效的完整日期 YYYY-MM-DD');
  if (startDate > today || (endDate !== PRESENT_DATE && endDate > today))
    throw new Error('日期不能位于未来');
  if (endDate < startDate) throw new Error('结束日期不能早于开始日期');
  if (!draft.placeName.trim()) throw new Error('请填写地点');
  if (!draft.confirmed || !validCoordinate(draft))
    throw new Error('请先选择并确认地图位置');
  if (
    draft.placeName.trim().length > 100 ||
    (draft.address?.length ?? 0) > 500 ||
    (draft.note?.length ?? 0) > 5000
  )
    throw new Error('地点、地址或备注过长');
  return {
    startDate,
    endDate,
    placeName: draft.placeName.trim(),
    address: draft.address?.trim() || null,
    city: draft.city?.trim() || null,
    regionCode: draft.regionCode || null,
    longitude: draft.longitude!,
    latitude: draft.latitude!,
    coordinateSystem: 'GCJ02',
    providerUid: draft.providerUid || null,
    note: draft.note?.trim() || null,
  };
}

export function validCoordinate(point: {
  latitude: null | number;
  longitude: null | number;
}): boolean {
  return (
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90
  );
}

export function sortFootprints(records: Footprint[]): Footprint[] {
  return [...records].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id),
  );
}
export function timeLabel(
  record: Pick<FootprintRequest, 'endDate' | 'startDate'>,
): string {
  return `${record.startDate.replaceAll('-', '.')} — ${record.endDate === PRESENT_DATE ? '至今' : (record.endDate || '').replaceAll('-', '.')}`;
}

/** 按屏幕距离聚合，不合并记录，也不把雪花 ID 转为数值。 */
export function groupLocations(
  records: Footprint[],
  zoom: number,
  project: (point: Coordinate) => Coordinate = (point) => point,
): LocationGroup[] {
  const groups: (LocationGroup & { x: number; y: number })[] = [];
  const scale = 256 * 2 ** Math.min(zoom, 22);
  for (const record of records) {
    if (!validCoordinate(record)) continue;
    const position = project(record);
    const sin = Math.sin(
      (Math.max(-85.051_128_78, Math.min(85.051_128_78, position.latitude)) *
        Math.PI) /
        180,
    );
    const x = ((position.longitude + 180) / 360) * scale;
    const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
    const group = groups.find((g) => Math.hypot(g.x - x, g.y - y) < 44);
    if (group) {
      const n = group.records.length;
      group.longitude = (group.longitude * n + record.longitude) / (n + 1);
      group.latitude = (group.latitude * n + record.latitude) / (n + 1);
      group.records.push(record);
      group.x = (group.x * n + x) / (n + 1);
      group.y = (group.y * n + y) / (n + 1);
    } else
      groups.push({
        key: record.id,
        longitude: record.longitude,
        latitude: record.latitude,
        records: [record],
        x,
        y,
      });
  }
  return groups.map(({ x: _x, y: _y, ...group }) => group);
}
