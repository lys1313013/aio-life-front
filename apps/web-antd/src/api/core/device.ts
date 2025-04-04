import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/device/query', data);
}

/**
 * 新增
 */
export async function insertOrUpdate(data: any) {
  return await requestClient.post('/device/insertOrUpdate', data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.post('/device/delete', data);
}
