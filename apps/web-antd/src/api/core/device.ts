import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/device/query', data);
}

/**
 * 新增
 */
export async function add(data: ApiRequests['DeviceCreateReq']) {
  return await requestClient.post(
    '/device',
    pickPayload('DeviceCreateReq', data),
  );
}

/**
 * 更新
 */
export async function update(
  id: number | string,
  data: ApiRequests['DeviceUpdateReq'],
) {
  return await requestClient.put(
    `/device/${id}`,
    pickPayload('DeviceUpdateReq', data),
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
export async function deleteData(id: number | string) {
  return await requestClient.delete(`/device/${id}`);
}
