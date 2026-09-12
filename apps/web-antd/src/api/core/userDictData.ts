import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/userDictData/query', data);
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
  return await getQuery('/userDictData/admin/query', data);
}

export async function adminInsert(data: any) {
  return await requestClient.post('/userDictData/admin', data);
}

export async function adminUpdate(data: any) {
  return await requestClient.put(`/userDictData/admin/${data.id}`, data);
}

export interface UserDictDataSortItem {
  dictSort: number;
  id: string;
}

export async function adminReSort(data: {
  dictType: string;
  dragId: string;
  position: 'after' | 'before';
  targetId: string;
}) {
  return await requestClient.post<UserDictDataSortItem[]>(
    '/userDictData/admin/reSort',
    data,
  );
}

export async function adminDelete(id: string) {
  return await requestClient.delete(`/userDictData/admin/${id}`);
}
