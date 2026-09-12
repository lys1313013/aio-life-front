import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withGetRetry } from './get-retry';

describe('gET 传输重试', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('重试成功后响应拦截器仅解包一次', async () => {
    const adapter = vi
      .fn()
      .mockRejectedValueOnce(new AxiosError('Network Error'))
      .mockImplementationOnce(async (config) => ({
        config,
        data: { rscode: '0', data: { id: '123' } },
        status: 200,
        statusText: 'OK',
        headers: {},
      }));
    const client = axios.create({ adapter: withGetRetry(adapter) });
    const unwrap = vi.fn((response) => response.data.data);
    client.interceptors.response.use(unwrap);
    const result = client.get('/query');
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ id: '123' });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(unwrap).toHaveBeenCalledTimes(1);
  });

  it('最多三次尝试且最终错误只处理一次', async () => {
    const adapter = vi.fn().mockRejectedValue(new AxiosError('Network Error'));
    const client = axios.create({ adapter: withGetRetry(adapter) });
    const handleError = vi.fn((error) => Promise.reject(error));
    client.interceptors.response.use(undefined, handleError);
    const result = client.get('/query').catch((error) => error);
    await vi.runAllTimersAsync();
    expect(await result).toBeInstanceOf(AxiosError);
    expect(adapter).toHaveBeenCalledTimes(3);
    expect(handleError).toHaveBeenCalledTimes(1);
  });

  it('发送验证码的 POST 不重试', async () => {
    const adapter = vi.fn().mockRejectedValue(new AxiosError('Network Error'));
    const client = axios.create({ adapter: withGetRetry(adapter) });
    await expect(
      client.post('/auth/sendEmailCode', { email: 'user@example.com' }),
    ).rejects.toThrow('Network Error');
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('退避期间取消后不再发起请求', async () => {
    const adapter = vi.fn().mockRejectedValue(new AxiosError('Network Error'));
    const client = axios.create({ adapter: withGetRetry(adapter) });
    const controller = new AbortController();
    const result = client
      .get('/query', { signal: controller.signal })
      .catch((error) => error);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    await vi.runAllTimersAsync();
    expect(axios.isCancel(await result)).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
