import { flushPromises, mount } from '@vue/test-utils';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import QrCodeLogin from './qrcode-login.vue';

const api = vi.hoisted(() => ({
  createWechatWebLogin: vi.fn(),
  getWechatWebStatus: vi.fn(),
  revokeWechatWebLogin: vi.fn().mockResolvedValue(undefined),
}));
const login = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('#/api/core/wechat-web', () => api);
vi.mock('#/store', () => ({
  useAuthStore: () => ({ authWechatLogin: login }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@vben/constants', () => ({ LOGIN_PATH: '/auth/login' }));
vi.mock('@ant-design/icons-vue', () => ({
  ReloadOutlined: { template: '<i />' },
}));
vi.mock('ant-design-vue', () => ({
  Button: { template: '<button><slot /></button>' },
  Spin: { template: '<div role="progressbar" />' },
}));
const challenge = {
  scene: 'a'.repeat(32),
  browserSecret: 'b'.repeat(64),
  qrCode: 'data:image/png;base64,fixture',
  expiresIn: 300,
};
let wrapper: ReturnType<typeof mount>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  api.createWechatWebLogin.mockResolvedValue(challenge);
  api.getWechatWebStatus.mockResolvedValue({ status: 'WAITING' });
});
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});
async function open() {
  wrapper = mount(QrCodeLogin);
  await flushPromises();
}
async function poll() {
  await vi.advanceTimersByTimeAsync(1500);
  await flushPromises();
}

describe('小程序扫码登录网页版', () => {
  it('只有确认后才兑换，扫码状态不签发会话', async () => {
    api.getWechatWebStatus
      .mockResolvedValueOnce({ status: 'SCANNED' })
      .mockResolvedValueOnce({ status: 'CONFIRMED' });
    await open();
    expect(wrapper.get('img').attributes('src')).toBe(challenge.qrCode);
    expect(wrapper.html()).not.toContain(challenge.browserSecret);
    await poll();
    expect(wrapper.text()).toContain('已扫码');
    expect(login).not.toHaveBeenCalled();
    await poll();
    expect(login).toHaveBeenCalledExactlyOnceWith(challenge);
    await poll();
    expect(api.getWechatWebStatus).toHaveBeenCalledTimes(2);
  });
  it.each(['CANCELLED', 'EXPIRED', 'CONSUMED'])(
    '%s 停止轮询并允许刷新',
    async (status) => {
      api.getWechatWebStatus.mockResolvedValue({ status });
      await open();
      await poll();
      await poll();
      expect(api.getWechatWebStatus).toHaveBeenCalledTimes(1);
      expect(login).not.toHaveBeenCalled();
      await wrapper.get('[aria-label="刷新二维码"]').trigger('click');
      await flushPromises();
      expect(api.revokeWechatWebLogin).toHaveBeenCalledWith(challenge);
      expect(api.createWechatWebLogin).toHaveBeenCalledTimes(2);
    },
  );
  it('请求失败后停下，重试生成新的二维码', async () => {
    api.getWechatWebStatus.mockRejectedValueOnce(new Error('offline'));
    await open();
    await poll();
    await poll();
    expect(wrapper.text()).toContain('连接失败');
    expect(api.getWechatWebStatus).toHaveBeenCalledTimes(1);
    await wrapper.get('[aria-label="刷新二维码"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('使用微信扫一扫');
  });
  it('离开页面后的确认响应不触发登录', async () => {
    let resolve!: (value: { status: string }) => void;
    api.getWechatWebStatus.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await open();
    await poll();
    wrapper.unmount();
    resolve({ status: 'CONFIRMED' });
    await flushPromises();
    expect(login).not.toHaveBeenCalled();
    expect(api.revokeWechatWebLogin).toHaveBeenCalledWith(challenge);
  });
  it('本地有效期结束后不再请求或兑换', async () => {
    api.createWechatWebLogin.mockResolvedValueOnce({
      ...challenge,
      expiresIn: 1,
    });
    await open();
    await poll();
    expect(wrapper.text()).toContain('二维码已过期');
    expect(api.getWechatWebStatus).not.toHaveBeenCalled();
  });
  it('兑换失败不自动重放一次性凭证', async () => {
    api.getWechatWebStatus.mockResolvedValue({ status: 'CONFIRMED' });
    login.mockRejectedValueOnce(new Error('lost response'));
    await open();
    await poll();
    await poll();
    expect(login).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('连接失败');
  });
});
