import { requestClient } from '#/api/request';

export interface SystemRegion {
  code: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  hasChildren: boolean;
}
export async function getRegionChildren(parentCode?: string) {
  return await requestClient.get<SystemRegion[]>('/system/regions', {
    params: parentCode ? { parentCode } : {},
  });
}
export async function getRegionPath(code: string) {
  return await requestClient.get<SystemRegion[]>(
    `/system/regions/${code}/path`,
  );
}
