import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQrLogin, QrLoginError } from './qr-login';

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('#/api/request', () => ({
  baseRequestClient: { instance: { request: mocks.request } },
}));

describe('二维码登录响应协议', () => {
  beforeEach(() => vi.clearAllMocks());

  it('数字成功码解包票据', async () => {
    const ticket = { id: '9223372036854775807', browserSecret: 'fixture' };
    mocks.request.mockResolvedValue({
      data: { code: 0, message: null, data: ticket },
    });
    expect(await createQrLogin()).toEqual(ticket);
  });

  it('业务失败读取 message，避免自动重试无效票据', async () => {
    mocks.request.mockResolvedValue({
      data: { code: 100_400, message: '票据已失效', data: null },
    });
    await expect(createQrLogin()).rejects.toMatchObject({
      message: '票据已失效',
      retryable: false,
    });
  });

  it('限流的 HTTP 429 使用新错误字段并保留重试语义', async () => {
    mocks.request.mockRejectedValue({
      response: {
        status: 429,
        data: { code: 100_400, message: '操作过于频繁' },
      },
    });
    await expect(createQrLogin()).rejects.toMatchObject({
      message: '操作过于频繁',
      retryable: true,
    });
  });

  it('旧的字符串成功码不能通过', async () => {
    mocks.request.mockResolvedValue({ data: { code: '0', data: {} } });
    await expect(createQrLogin()).rejects.toBeInstanceOf(QrLoginError);
  });
});
