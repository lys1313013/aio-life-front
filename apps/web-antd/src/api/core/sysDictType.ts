import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/sysDictType/query', data);
}

/**
 * 新增
 */
export async function add(data: any) {
  return await requestClient.post('/sysDictType', data);
}

/**
 * 更新
 */
export async function update(dictId: number | string, data: any) {
  return await requestClient.put(`/sysDictType/${dictId}`, data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/sysDictType/${data.dictId}`);
}
