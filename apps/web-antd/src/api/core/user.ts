import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
}

export interface UpdateUserParams {
  nickname: string;
  introduction: string;
  email?: string;
}

/**
 * 更新用户信息
 */
export async function updateUserInfoApi(params: UpdateUserParams) {
  return requestClient.put('/users', params);
}
