import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/userDictData/query', data);
}

/**
 * 新增或更新
 */
export async function insertOrUpdate(data: any) {
  return await requestClient.post('/userDictData/insertOrUpdate', data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.post('/userDictData/delete', data);
}
