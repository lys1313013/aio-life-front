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
  createTime: string;
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

export async function createPasswordApi(data: PasswordVaultForm) {
  return requestClient.post<boolean>('/password', data);
}

export async function updatePasswordApi(id: string, data: PasswordVaultForm) {
  return requestClient.put<boolean>(`/password/${id}`, data);
}

export async function deletePasswordApi(id: string) {
  return requestClient.delete<boolean>(`/password/${id}`);
}

export async function getCategoriesApi() {
  return requestClient.get<string[]>('/password/categories');
}
