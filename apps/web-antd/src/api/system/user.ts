import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 获取用户列表
 */
export async function getUserListApi(params: any) {
  return getQuery('/user-center/list', params);
}

/**
 * 新增用户
 */
export async function addUserApi(data: ApiRequests['UserCreateReq']) {
  return requestClient.post('/user-center', pickPayload('UserCreateReq', data));
}

/**
 * 修改用户
 */
export async function updateUserApi(data: ApiRequests['UserUpdateReq']) {
  return requestClient.put('/user-center', pickPayload('UserUpdateReq', data));
}

/**
 * 删除用户
 */
export async function deleteUserApi(id: number) {
  return requestClient.delete(`/user-center/${id}`);
}
