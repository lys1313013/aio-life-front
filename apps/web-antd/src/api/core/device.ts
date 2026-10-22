import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';
import { afterHomeSectionWrite } from '#/utils/home-section-change';

import { FILE_BIZ_TYPE, uploadFile } from './common';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/device/query', data);
}

/** Read a single owned device without depending on the list's page or type filter. */
export async function getDevice(id: string) {
  return requestClient.get<
    (ApiRequests['DeviceUpdateReq'] & { id: string }) | null
  >(`/device/${id}`);
}

/**
 * 新增
 */
export async function add(data: ApiRequests['DeviceCreateReq']) {
  return afterHomeSectionWrite(
    'device',
    requestClient.post('/device', pickPayload('DeviceCreateReq', data)),
  );
}

/**
 * 更新
 */
export async function update(
  id: string,
  data: ApiRequests['DeviceUpdateReq'],
) {
  return afterHomeSectionWrite(
    'device',
    requestClient.put(`/device/${id}`, pickPayload('DeviceUpdateReq', data)),
  );
}

/**
 * 上传设备图片
 */
export async function uploadImage(file: File) {
  return await uploadFile(file, FILE_BIZ_TYPE.DEVICE);
}

/**
 * 删除
 */
export async function deleteData(id: string) {
  return afterHomeSectionWrite('device', requestClient.delete(`/device/${id}`));
}
