import type { ApiRequests } from '#/api/payload';

import { useAccessStore } from '@vben/stores';

import { pickPayload } from '#/api/payload';
import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }

  export interface ChangePasswordParams {
    oldPassword?: string;
    newPassword?: string;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    username?: string;
    password?: string;
    email?: string;
    code?: string;
  }

  /** 重置密码接口参数 */
  export interface ResetPasswordParams {
    email?: string;
    password?: string;
    code?: string;
  }
}

/**
 * 登录
 */
export async function loginApi(data: ApiRequests['LoginReq']) {
  return requestClient.post<AuthApi.LoginResult>(
    '/auth/login',
    pickPayload('LoginReq', data),
  );
}

/**
 * 注册
 */
export async function registerApi(data: ApiRequests['RegisterReq']) {
  return requestClient.post('/auth/register', pickPayload('RegisterReq', data));
}

/**
 * 发送邮箱验证码
 */
export async function sendEmailCodeApi(email: string) {
  return requestClient.post(
    '/auth/sendEmailCode',
    pickPayload('SendEmailCodeReq', { email }),
  );
}

/**
 * 发送重置密码验证码
 */
export async function sendResetPasswordCodeApi(email: string) {
  return requestClient.post(
    '/auth/sendResetPasswordCode',
    pickPayload('SendEmailCodeReq', { email }),
  );
}

/**
 * 重置密码
 */
export async function resetPasswordApi(data: ApiRequests['ResetPasswordReq']) {
  return requestClient.post(
    '/auth/resetPassword',
    pickPayload('ResetPasswordReq', data),
  );
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 * 用 baseRequestClient 而非 requestClient，避免 401 拦截器在登出失败时再次触发 logout 造成死循环。
 * 手动拼 Bearer header 以满足后端鉴权前缀要求。
 */
export async function logoutApi() {
  const token = useAccessStore().accessToken;
  return baseRequestClient.post('/auth/logout', null, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}

/**
 * 修改密码
 */
export async function changePasswordApi(
  data: ApiRequests['ChangePasswordReq'],
) {
  return requestClient.post(
    '/auth/change-password',
    pickPayload('ChangePasswordReq', data),
  );
}

/** 二级锁相关接口 */

export interface SecondaryPasswordStatus {
  hasPassword: boolean;
}

export interface SecondaryVerifyParams {
  password: string;
  menuPath: string;
}

export interface SetSecondaryPasswordParams {
  password: string;
  oldPassword?: string;
}

/**
 * 查询是否已设置二级密码
 */
export async function getSecondaryPasswordStatusApi() {
  return requestClient.get<SecondaryPasswordStatus>(
    '/auth/secondary-password/status',
  );
}

/**
 * 设置/修改二级密码
 */
export async function setSecondaryPasswordApi(
  data: ApiRequests['SetSecondaryPasswordReq'],
) {
  return requestClient.put(
    '/auth/secondary-password',
    pickPayload('SetSecondaryPasswordReq', data),
  );
}

/**
 * 验证二级密码，解锁菜单
 */
export async function secondaryVerifyApi(
  data: ApiRequests['SecondaryVerifyReq'],
) {
  return requestClient.post(
    '/auth/secondary-verify',
    pickPayload('SecondaryVerifyReq', data),
  );
}

export interface SaveSecondaryLockMenusParams {
  menuIds: string[];
  /** 二级密码，修改菜单锁前必须验证 */
  secondaryPassword: string;
}

/**
 * 获取当前用户锁定的菜单 ID 列表
 */
export async function getSecondaryLockMenusApi() {
  return requestClient.get<string[]>('/auth/secondary-lock/menus');
}

/**
 * 保存当前用户锁定的菜单 ID 列表
 */
export async function saveSecondaryLockMenusApi(
  data: ApiRequests['SaveSecondaryLockMenusReq'],
) {
  return requestClient.put(
    '/auth/secondary-lock/menus',
    pickPayload('SaveSecondaryLockMenusReq', data),
  );
}

/**
 * 发送重置二级密码验证码（发到当前用户绑定的邮箱）
 */
export async function sendResetSecondaryPasswordCodeApi() {
  return requestClient.post('/auth/send-reset-secondary-password-code');
}

/** 重置二级密码参数 */
export interface ResetSecondaryPasswordParams {
  code: string;
  password: string;
}

/**
 * 通过邮箱验证码重置二级密码
 */
export async function resetSecondaryPasswordApi(
  data: ApiRequests['ResetSecondaryPasswordReq'],
) {
  return requestClient.post(
    '/auth/reset-secondary-password',
    pickPayload('ResetSecondaryPasswordReq', data),
  );
}
