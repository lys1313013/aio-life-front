import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
}

export interface UserBasicInfo {
  id: string;
  nickname: string;
  avatar: string;
}

/**
 * 获取用户基本信息
 */
export async function getUserBasicInfoApi(id: string) {
  return requestClient.get<UserBasicInfo>(`/user/${id}/basic`);
}

export interface UpdateUserParams {
  nickname: string;
  introduction: string;
  email?: string;
  avatar?: string;
}

/**
 * 更新用户信息
 */
export async function updateUserInfoApi(params: UpdateUserParams) {
  return requestClient.put('/users', params);
}
