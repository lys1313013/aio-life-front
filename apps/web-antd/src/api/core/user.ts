import type { UserInfo } from '@vben/types';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  const data = await requestClient.get<Omit<UserInfo, 'avatar'>>('/user/info');
  return { ...data, avatar: data.avatarUrl || '' };
}

export interface UserBasicInfo {
  id: string;
  nickname: string;
  avatarFileId: string | null;
  avatarUrl: string | null;
  avatar: string;
}

/**
 * 获取用户基本信息
 */
export async function getUserBasicInfoApi(id: string) {
  const data = await requestClient.get<Omit<UserBasicInfo, 'avatar'>>(
    `/user/${id}/basic`,
  );
  return { ...data, avatar: data.avatarUrl || '' };
}

export interface UpdateUserParams {
  nickname: string;
  introduction: string;
  email?: string;
  avatarFileId?: string | null;
}

/**
 * 更新用户信息
 */
export async function updateUserInfoApi(params: ApiRequests['UpdateUserReq']) {
  return requestClient.put('/users', pickPayload('UpdateUserReq', params));
}

/**
 * 上传头像
 */
export async function uploadAvatarApi(file: File) {
  return uploadFile(file, FILE_BIZ_TYPE.AVATAR);
}
