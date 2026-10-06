import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestClient } from './request';

const mocks = vi.hoisted(() => ({
  error: vi.fn(),
  logout: vi.fn(),
  setAccessToken: vi.fn(),
  triggerUnlock: vi.fn(),
}));

vi.mock('@vben/hooks', () => ({ useAppConfig: () => ({ apiURL: '/api' }) }));
vi.mock('@vben/locales', () => ({ $t: (key: string) => key }));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { enableRefreshToken: false, locale: 'zh-CN' } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => ({
    accessToken: 'fixture-token',
    setAccessToken: mocks.setAccessToken,
  }),
}));
vi.mock('ant-design-vue', () => ({ message: { error: mocks.error } }));
vi.mock('#/store', () => ({ useAuthStore: () => ({ logout: mocks.logout }) }));
vi.mock('#/store/secondary-lock', () => ({
  useSecondaryLockStore: () => ({ triggerUnlock: mocks.triggerUnlock }),
}));
vi.mock('./core/auth', () => ({ refreshTokenApi: vi.fn() }));

function respond(data: unknown, status = 200) {
  requestClient.instance.defaults.adapter = async (config) => {
    const response = { config, data, headers: {}, status, statusText: '' };
    if (status >= 400) {
      throw Object.assign(new Error('HTTP request failed'), {
        config,
        response,
      });
    }
    return response;
  };
}

describe('统一响应协议', () => {
  beforeEach(() => vi.clearAllMocks());

  it('数字 0 解包业务数据，保留长 ID 和空响应', async () => {
    const data = { id: '9223372036854775807' };
    respond({ code: 0, message: null, data });
    expect(await requestClient.get('/record')).toEqual(data);
    respond({ code: 0, message: null, data: null });
    expect(await requestClient.post('/save')).toBeNull();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('业务失败在 HTTP 200 和 HTTP 400 时都读取 message', async () => {
    for (const status of [200, 400]) {
      respond({ code: 100_400, message: '参数错误', data: null }, status);
      await expect(requestClient.post('/save')).rejects.toBeDefined();
      expect(mocks.error).toHaveBeenLastCalledWith({
        content: '参数错误',
        key: 'global-request-error',
      });
    }
  });

  it('数字二级锁触发解锁并避免重复错误提示', async () => {
    respond({
      code: 2001,
      message: '需要二级密码验证',
      data: { menuPath: '/finance' },
    });
    await expect(requestClient.get('/finance/query')).rejects.toBeDefined();
    expect(mocks.triggerUnlock).toHaveBeenCalledExactlyOnceWith(
      '/finance',
      false,
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('字符串码和旧协议不能被当成成功', async () => {
    for (const body of [
      { code: '0', data: {} },
      { rscode: '0', result: null, data: {} },
    ]) {
      respond(body);
      await expect(requestClient.post('/save')).rejects.toBeDefined();
    }
  });

  it('会话过期的 JSON 401 继续触发重新登录', async () => {
    respond({ code: 401, message: '登录已过期，请重新登录', data: null }, 401);
    await expect(requestClient.get('/user/info')).rejects.toBeDefined();
    expect(mocks.setAccessToken).toHaveBeenCalledWith(null);
    expect(mocks.logout).toHaveBeenCalledOnce();
  });
});
