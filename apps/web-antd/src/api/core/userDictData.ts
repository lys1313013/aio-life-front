import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
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
export async function insert(data: ApiRequests['UserDictDataCreateReq']) {
  return await requestClient.post(
    '/userDictData',
    pickPayload('UserDictDataCreateReq', data),
  );
}

/**
 * 更新
 */
export async function update(data: ApiRequests['UserDictDataUpdateReq']) {
  return await requestClient.put(
    '/userDictData',
    pickPayload('UserDictDataUpdateReq', data),
  );
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

export async function adminInsert(
  data: ApiRequests['UserDictDataAdminCreateReq'],
) {
  return await requestClient.post(
    '/userDictData/admin',
    pickPayload('UserDictDataAdminCreateReq', data),
  );
}

export async function adminUpdate(
  data: ApiRequests['UserDictDataAdminUpdateReq'] & { id?: string },
) {
  return await requestClient.put(
    `/userDictData/admin/${data.id}`,
    pickPayload('UserDictDataAdminUpdateReq', data),
  );
}

export interface UserDictDataSortItem {
  dictSort: number;
  id: string;
}

export async function adminReSort(data: ApiRequests['UserDictDataReSortReq']) {
  return await requestClient.post<UserDictDataSortItem[]>(
    '/userDictData/admin/reSort',
    pickPayload('UserDictDataReSortReq', data),
  );
}

export async function adminDelete(id: string) {
  return await requestClient.delete(`/userDictData/admin/${id}`);
}
