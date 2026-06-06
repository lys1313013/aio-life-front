import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/userDictData/query', data);
}

/**
 * 新增
 */
export async function insert(data: any) {
  return await requestClient.post('/userDictData', data);
}

/**
 * 更新
 */
export async function update(data: any) {
  return await requestClient.put('/userDictData', data);
}

/**
 * 删除
 */
export async function deleteData(id: string) {
  return await requestClient.delete(`/userDictData/${id}`);
}

// ================= 管理员 API =================

export async function adminQuery(data: any) {
  return await requestClient.post('/userDictData/admin/query', data);
}

export async function adminInsert(data: any) {
  return await requestClient.post('/userDictData/admin', data);
}

export async function adminUpdate(data: any) {
  return await requestClient.put(`/userDictData/admin/${data.id}`, data);
}

export async function adminDelete(id: string) {
  return await requestClient.delete(`/userDictData/admin/${id}`);
}
