import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/device/query', data);
}

/**
 * 新增
 */
export async function add(data: any) {
  return await requestClient.post('/device', data);
}

/**
 * 更新
 */
export async function update(id: number | string, data: any) {
  return await requestClient.put(`/device/${id}`, data);
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
