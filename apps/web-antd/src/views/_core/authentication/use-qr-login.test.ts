import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQrLogin } from './use-qr-login';

const api = vi.hoisted(() => ({
  create: vi.fn(),
  status: vi.fn(),
  consume: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('#/api/core/qr-login', () => ({
  createQrLogin: api.create,
  getQrLoginStatus: api.status,
  consumeQrLogin: api.consume,
  cancelQrLogin: api.cancel,
  QrLoginError: class extends Error {},
}));
const ticket = {
  id: 'id',
  browserSecret: 'browser-only',
  qrContent: 'qr-only',
  verificationCode: '1234',
  expiresIn: 120,
  pollInterval: 2,
};
let flow: ReturnType<typeof useQrLogin>;
let wrapper: ReturnType<typeof mount>;
let finish: ReturnType<typeof vi.fn>;
async function start() {
  wrapper = mount(
    defineComponent({
      setup() {
        flow = useQrLogin(finish);
        return () => null;
      },
    }),
  );
  await flushPromises();
}
async function advance(ms = 2000) {
  await vi.advanceTimersByTimeAsync(ms);
  await flushPromises();
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false,
  });
  api.create.mockResolvedValue(ticket);
  api.cancel.mockResolvedValue(undefined);
  api.status.mockResolvedValue({ status: 'WAITING', expiresIn: 118 });
  api.consume.mockResolvedValue({ accessToken: 'new-web-token' });
  finish = vi.fn().mockResolvedValue(undefined);
});
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});

describe('扫码登录轮询生命周期', () => {
  it('只在确认后兑换，登录成功后停止轮询', async () => {
    api.status
      .mockResolvedValueOnce({ status: 'SCANNED' })
      .mockResolvedValueOnce({ status: 'CONFIRMED' });
    await start();
    await advance();
    expect(flow.status.value).toBe('SCANNED');
    expect(api.consume).not.toHaveBeenCalled();
    await advance();
    expect(finish).toHaveBeenCalledWith('new-web-token');
    await advance(10_000);
    expect(api.consume).toHaveBeenCalledTimes(1);
    expect(api.status).toHaveBeenCalledTimes(2);
  });
  it('兑换响应丢失后重新查询并领取同一结果', async () => {
    api.status
      .mockResolvedValueOnce({ status: 'CONFIRMED' })
      .mockResolvedValue({ status: 'CONSUMED' });
    api.consume
      .mockRejectedValueOnce(new Error('network lost'))
      .mockResolvedValue({ accessToken: 'same-token' });
    await start();
    await advance();
    expect(finish).not.toHaveBeenCalled();
    await advance(4000);
    expect(finish).toHaveBeenCalledWith('same-token');
    expect(api.consume).toHaveBeenCalledTimes(2);
  });
  it('拒绝或过期后不再请求', async () => {
    api.status.mockResolvedValue({ status: 'REJECTED' });
    await start();
    await advance();
    await advance(10_000);
    expect(api.status).toHaveBeenCalledTimes(1);
    expect(api.consume).not.toHaveBeenCalled();
    await flow.refresh();
    await flushPromises();
    api.status.mockResolvedValue({ status: 'WAITING' });
    await advance(120_000);
    const count = api.status.mock.calls.length;
    expect(flow.status.value).toBe('EXPIRED');
    await advance(10_000);
    expect(api.status).toHaveBeenCalledTimes(count);
  });
  it('挂起的查询不重叠，刷新后旧响应不触发登录', async () => {
    let resolve: (value: unknown) => void = () => {};
    api.status.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    await advance();
    await advance(10_000);
    expect(api.status).toHaveBeenCalledTimes(1);
    await flow.refresh();
    expect(api.cancel).toHaveBeenCalledWith(ticket);
    resolve({ status: 'CONFIRMED' });
    await flushPromises();
    expect(api.consume).not.toHaveBeenCalled();
    await advance(2000);
    expect(api.status.mock.calls.length).toBeGreaterThan(1);
  });
  it('页面隐藏暂停查询，重新显示后恢复', async () => {
    await start();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await advance(5000);
    expect(api.status).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await advance(1);
    expect(api.status).toHaveBeenCalledTimes(1);
  });
  it('用户信息初始化失败可以重试，不重复兑换', async () => {
    api.status.mockResolvedValue({ status: 'CONFIRMED' });
    finish.mockRejectedValueOnce(new Error('profile failed'));
    await start();
    await advance();
    expect(flow.error.value).toContain('重试');
    await flow.retry();
    expect(finish).toHaveBeenCalledTimes(2);
    expect(api.consume).toHaveBeenCalledTimes(1);
  });
  it('离页后创建请求的旧响应会立即撤销', async () => {
    let resolve: (value: unknown) => void = () => {};
    api.create.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    wrapper.unmount();
    resolve(ticket);
    await flushPromises();
    expect(api.cancel).toHaveBeenCalledWith(ticket);
    await advance(5000);
    expect(api.status).not.toHaveBeenCalled();
  });
  it('过期后迟到的待扫码响应不能恢复二维码', async () => {
    let resolve: (value: unknown) => void = () => {};
    api.status.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await start();
    await advance(120_000);
    expect(flow.status.value).toBe('EXPIRED');
    resolve({ status: 'WAITING', expiresIn: 118 });
    await flushPromises();
    expect(flow.status.value).toBe('EXPIRED');
    await advance(5000);
    expect(api.status).toHaveBeenCalledTimes(1);
  });
});
