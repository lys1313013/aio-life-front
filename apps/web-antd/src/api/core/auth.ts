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
export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

/**
 * 注册
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return requestClient.post('/auth/register', data);
}

/**
 * 发送邮箱验证码
 */
export async function sendEmailCodeApi(email: string) {
  return requestClient.get('/auth/sendEmailCode', { params: { email } });
}

/**
 * 发送重置密码验证码
 */
export async function sendResetPasswordCodeApi(email: string) {
  return requestClient.get('/auth/sendResetPasswordCode', {
    params: { email },
  });
}

/**
 * 重置密码
 */
export async function resetPasswordApi(data: AuthApi.ResetPasswordParams) {
  return requestClient.post('/auth/resetPassword', data);
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
 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', {
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
export async function changePasswordApi(data: AuthApi.ChangePasswordParams) {
  return requestClient.post('/auth/change-password', data);
}
