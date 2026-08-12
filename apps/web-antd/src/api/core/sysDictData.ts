import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/sysDictData/query', data);
}

/**
 * 新增
 */
export async function add(data: any) {
  return await requestClient.post('/sysDictData', data);
}

/**
 * 更新
 */
export async function update(dictCode: number | string, data: any) {
  return await requestClient.put(`/sysDictData/${dictCode}`, data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/sysDictData/${data.dictCode}`);
}
