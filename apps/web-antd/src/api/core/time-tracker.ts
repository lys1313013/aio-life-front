import { requestClient } from '#/api/request';

/**
 * 查询数据
 */
export async function query(data: any) {
  return await requestClient.post('/timeRecord/query', data);
}

/**
 * 更新数据
 */
export async function update(data: any) {
  return await requestClient.post('/timeRecord/update', data);
}

/**
 * 更新数据
 */
export async function batchUpdate(data: any) {
  return await requestClient.post('/timeRecord/batchUpdate', data);
}

/**
 * 删除数据
 */
export async function deleteByDate(data: any) {
  return await requestClient.post('/timeRecord/deleteByDate', data);
}