import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface PasswordVault {
  id: string;
  title: string;
  website: string;
  category: string;
  username: string;
  password: string;
  salt: string;
  remark: string;
  favorite: boolean;
  updateTime: string;
}

export interface PasswordVaultForm {
  title: string;
  website?: string;
  category?: string;
  username: string;
  password: string;
  salt: string;
  remark?: string;
  favorite?: boolean;
}

export async function getPasswordListApi() {
  return requestClient.get<PasswordVault[]>('/password/list');
}

export async function getPasswordApi(id: string) {
  return requestClient.get<PasswordVault>(`/password/${id}`);
}

export async function createPasswordApi(
  data: ApiRequests['PasswordVaultCreateReq'],
) {
  return requestClient.post<boolean>(
    '/password',
    pickPayload('PasswordVaultCreateReq', data),
  );
}

export async function updatePasswordApi(
  id: string,
  data: ApiRequests['PasswordVaultUpdateReq'],
) {
  return requestClient.put<boolean>(
    `/password/${id}`,
    pickPayload('PasswordVaultUpdateReq', data),
  );
}

export async function deletePasswordApi(id: string) {
  return requestClient.delete<boolean>(`/password/${id}`);
}

export const DEFAULT_PASSWORD_CATEGORIES = [
  '工作',
  '生活',
  '学习',
  '金融',
  '社交',
  '游戏',
  '其他',
];

export async function getCategoriesApi() {
  return requestClient.get<string[]>('/password/categories');
}
