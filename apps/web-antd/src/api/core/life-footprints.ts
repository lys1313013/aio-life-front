import type { LifeFootprintBatchSaveReq } from '#/api/payload';
import type {
  Footprint,
  FootprintRequest,
  LocationResult,
  MapConfig,
} from '#/views/my-hub/life-footprints/model';

import { requestClient } from '#/api/request';

export async function saveFootprintBatch(data: LifeFootprintBatchSaveReq) {
  // 保留 HTTP 错误状态，区分明确拒绝与超时等结果不确定的写入；沿用认证和业务码拦截器。
  return await requestClient.instance.post<Footprint[], Footprint[]>(
    '/life-footprints/batch',
    data,
  );
}

export async function getFootprints() {
  return await requestClient.get<Footprint[]>('/life-footprints');
}
export async function getFootprint(id: string) {
  return await requestClient.get<Footprint>(`/life-footprints/${id}`);
}
export async function createFootprint(data: FootprintRequest) {
  return await requestClient.post<Footprint>('/life-footprints', data);
}
export async function updateFootprint(id: string, data: FootprintRequest) {
  return await requestClient.put<Footprint>(`/life-footprints/${id}`, data);
}
export async function deleteFootprint(id: string) {
  return await requestClient.delete<void>(`/life-footprints/${id}`);
}
export async function getFootprintMapConfig() {
  const config = await requestClient.get<MapConfig>(
    '/life-footprints/map/config',
  );
  if (config.tencent) {
    const base = requestClient.instance.defaults.baseURL || '/api';
    config.tencent.serviceHost = new URL(
      `${base.replace(/\/$/, '')}/life-footprints/map/tencent-proxy`,
      window.location.origin,
    ).href;
  }
  return config;
}
export async function searchFootprintLocations(
  keyword: string,
  region = '全国',
) {
  return await requestClient.get<LocationResult[]>(
    '/life-footprints/map/search',
    { params: { keyword, region } },
  );
}
export async function geocodeFootprintAddress(address: string) {
  return await requestClient.get<LocationResult>(
    '/life-footprints/map/geocode',
    { params: { address } },
  );
}
export async function reverseFootprintLocation(
  longitude: number,
  latitude: number,
) {
  return await requestClient.get<LocationResult>(
    '/life-footprints/map/reverse',
    { params: { longitude, latitude } },
  );
}
