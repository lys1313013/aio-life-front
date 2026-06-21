import { get, post, request } from '../utils/request';

/**
 * PasswordVault 实体接口
 */
export interface PasswordVaultEntity {
  id?: number;
  userId?: number;
  title: string;
  website?: string;
  category?: string;
  username?: string;
  password?: string;
  salt?: string;
  remark?: string;
  favorite?: boolean;
  createUser?: number;
  updateUser?: number;
  createTime?: string;
  updateTime?: string;
  isDeleted?: number;
}

/**
 * 查询密码列表
 */
export async function queryPasswordVault() {
  return await get<PasswordVaultEntity[]>('/password/list');
}

/**
 * 获取单条密码
 */
export async function getPasswordVault(id: number) {
  return await get<PasswordVaultEntity>(`/password/${id}`);
}

/**
 * 创建密码
 */
export async function createPasswordVault(data: PasswordVaultEntity) {
  return await post<PasswordVaultEntity>('/password', data);
}

/**
 * 更新密码
 */
export async function updatePasswordVault(data: PasswordVaultEntity) {
  return await request<PasswordVaultEntity>({
    url: `/password/${data.id}`,
    method: 'PUT',
    data,
  });
}

/**
 * 删除密码
 */
export async function deletePasswordVault(id: number) {
  return await request({
    url: `/password/${id}`,
    method: 'DELETE',
  });
}

/**
 * 获取分类列表
 */
export async function getPasswordCategories() {
  return await get<string[]>('/password/categories');
}
