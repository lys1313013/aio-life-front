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
/** 地图展示用编号，不参与请求或持久化。 */
export interface FootprintMapRecord extends Footprint {
  markerNumber?: number;
}
export interface LocationRegion {
  districtCode: string;
  townCode?: null | string;
  townName: string;
}
export interface LocationResult extends Coordinate {
  region?: LocationRegion | null;
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
    endDate: '',
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

export function validateDraft(draft: Draft) {
  const errors: Partial<
    Record<'endDate' | 'note' | 'placeName' | 'position' | 'startDate', string>
  > = {};
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  if (!validDate(startDate)) errors.startDate = '请选择开始日期';
  else if (startDate > today) errors.startDate = '开始日期不能晚于今天';
  if (!validDate(endDate)) errors.endDate = '请选择结束日期';
  else if (endDate !== PRESENT_DATE && endDate > today)
    errors.endDate = '结束日期不能晚于今天';
  else if (validDate(startDate) && endDate < startDate)
    errors.endDate = '结束日期不能早于开始日期';
  if (!draft.placeName.trim()) errors.placeName = '请选择或填写地点';
  else if (draft.placeName.trim().length > 100)
    errors.placeName = '地点名称不能超过100字';
  if (!validCoordinate(draft)) errors.position = '请选择地图位置';
  else if (!draft.confirmed) errors.position = '请确认所选位置';
  if ((draft.note?.length ?? 0) > 5000) errors.note = '备注不能超过5000字';
  return errors;
}

export function draftPayload(draft: Draft): FootprintRequest {
  const errors = validateDraft(draft);
  const message = Object.values(errors)[0];
  if (message) throw new Error(message);
  if ((draft.address?.length ?? 0) > 500)
    throw new Error('地点地址过长，请重新选择地点');
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();
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
