import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from './auth';

const mocks = vi.hoisted(() => ({
  loginApi: vi.fn(),
  exchange: vi.fn(),
  user: vi.fn(),
  codes: vi.fn(),
  push: vi.fn(),
  access: {
    setAccessToken: vi.fn(),
    setAccessCodes: vi.fn(),
    setLoginExpired: vi.fn(),
    loginExpired: false,
  },
  userStore: { setUserInfo: vi.fn() },
}));
vi.mock('@vben/constants', () => ({ LOGIN_PATH: '/auth/login' }));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { defaultHomePath: '/home' } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => mocks.access,
  useUserStore: () => mocks.userStore,
  resetAllStores: vi.fn(),
}));
vi.mock('ant-design-vue', () => ({ notification: { success: vi.fn() } }));
vi.mock('#/api/core/auth', () => ({
  loginApi: mocks.loginApi,
  getAccessCodesApi: mocks.codes,
  logoutApi: vi.fn(),
}));
vi.mock('#/api/core/user', () => ({ getUserInfoApi: mocks.user }));
vi.mock('#/api/core/wechat-web', () => ({
  exchangeWechatWebLogin: mocks.exchange,
}));
vi.mock('#/locales', () => ({ $t: (key: string) => key }));
vi.mock('#/router', () => ({ router: { push: mocks.push } }));
vi.mock('#/utils/file', () => ({ clearImageCache: vi.fn() }));
const credentials = { scene: 'a'.repeat(32), browserSecret: 'b'.repeat(64) };
const user = {
  id: '9223372036854775806',
  realName: '扫码测试用户',
  homePath: '/dashboard/home',
};
beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  mocks.access.loginExpired = false;
  mocks.exchange.mockResolvedValue({ accessToken: 'web-token' });
  mocks.loginApi.mockResolvedValue({ accessToken: 'password-token' });
  mocks.user.mockResolvedValue(user);
  mocks.codes.mockResolvedValue(['user:read']);
});
describe('扫码登录复用会话初始化', () => {
  it('兑换后保存业务Token、用户与权限并跳转原有首页', async () => {
    const store = useAuthStore();
    await store.authWechatLogin(credentials);
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith(credentials);
    expect(mocks.access.setAccessToken).toHaveBeenCalledExactlyOnceWith(
      'web-token',
    );
    expect(mocks.userStore.setUserInfo).toHaveBeenCalledWith(user);
    expect(mocks.access.setAccessCodes).toHaveBeenCalledWith(['user:read']);
    expect(mocks.push).toHaveBeenCalledWith('/dashboard/home');
    expect(store.loginLoading).toBe(false);
  });
  it('兑换失败不保存二维码凭证也不加载用户', async () => {
    mocks.exchange.mockRejectedValueOnce(new Error('expired'));
    const store = useAuthStore();
    await expect(store.authWechatLogin(credentials)).rejects.toThrow('expired');
    expect(mocks.access.setAccessToken).not.toHaveBeenCalled();
    expect(mocks.user).not.toHaveBeenCalled();
    expect(store.loginLoading).toBe(false);
  });
  it('密码登录仍使用原接口与成功回调', async () => {
    const callback = vi.fn();
    await useAuthStore().authLogin(
      { username: 'fixture', password: 'fixture-password' },
      callback,
    );
    expect(mocks.loginApi).toHaveBeenCalledWith({
      username: 'fixture',
      password: 'fixture-password',
    });
    expect(mocks.access.setAccessToken).toHaveBeenCalledWith('password-token');
    expect(callback).toHaveBeenCalledOnce();
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
