import { requestClient } from '#/api/request';

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
  return await requestClient.get<PasswordVaultEntity[]>('/password/list');
}

/**
 * 获取单条密码
 */
export async function getPasswordVault(id: number) {
  return await requestClient.get<PasswordVaultEntity>(`/password/${id}`);
}

/**
 * 创建密码
 */
export async function createPasswordVault(data: PasswordVaultEntity) {
  return await requestClient.post<PasswordVaultEntity>('/password', data);
}

/**
 * 更新密码
 */
export async function updatePasswordVault(data: PasswordVaultEntity) {
  return await requestClient.put<PasswordVaultEntity>(
    `/password/${data.id}`,
    data,
  );
}

/**
 * 删除密码
 */
export async function deletePasswordVault(id: number) {
  return await requestClient.delete(`/password/${id}`);
}

/**
 * 获取分类列表
 */
export async function getPasswordCategories() {
  return await requestClient.get<string[]>('/password/categories');
}

/**
 * 密码生成器选项
 */
export interface PasswordGeneratorOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
}

/**
 * 生成随机密码（前端实现，不依赖后端）
 */
export function generatePassword(
  options: PasswordGeneratorOptions = {},
): string {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = false,
    excludeAmbiguous = false,
  } = options;

  const uppercaseChars = excludeAmbiguous
    ? 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = excludeAmbiguous
    ? 'abcdefghjkmnpqrstuvwxyz'
    : 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = excludeAmbiguous ? '23456789' : '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = '';
  if (uppercase) chars += uppercaseChars;
  if (lowercase) chars += lowercaseChars;
  if (numbers) chars += numberChars;
  if (symbols) chars += symbolChars;

  if (!chars) chars = lowercaseChars + numberChars;

  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }

  return result;
}
