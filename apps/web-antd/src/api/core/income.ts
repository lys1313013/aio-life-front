import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/income/query', data);
}

/**
 * 新增
 */
export async function insertOrUpdate(data: any) {
  return await requestClient.post('/income/insertOrUpdate', data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.post('/income/delete', data);
}

/**
 * 统计
 */
export async function statistics(data: any) {
  return await requestClient.post('/income/static', data);
}
