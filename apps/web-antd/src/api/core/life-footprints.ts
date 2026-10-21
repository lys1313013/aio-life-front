import type {
  Footprint,
  FootprintRequest,
  LocationResult,
  MapConfig,
} from '#/views/my-hub/life-footprints/model';

import { requestClient } from '#/api/request';

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
  return await requestClient.get<MapConfig>('/life-footprints/map/config');
}
export async function searchFootprintLocations(keyword: string) {
  return await requestClient.get<LocationResult[]>(
    '/life-footprints/map/search',
    { params: { keyword } },
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
