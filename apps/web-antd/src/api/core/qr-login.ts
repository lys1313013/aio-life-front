import { baseRequestClient } from '#/api/request';

export interface QrLoginTicket {
  id: string;
  browserSecret: string;
  qrContent: string;
  verificationCode: string;
  expiresIn: number;
  pollInterval: number;
}
export type QrLoginStatus =
  | 'CONFIRMED'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'FAILED'
  | 'ISSUING'
  | 'REJECTED'
  | 'SCANNED'
  | 'WAITING';
export class QrLoginError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

// 匿名票据请求独立处理失败，轮询不触发全局登出、Token 刷新或重复 toast。
async function call<T>(
  path: string,
  data?: unknown,
  secret?: string,
): Promise<T> {
  try {
    const response = await baseRequestClient.instance.request({
      url: `/auth/qr-login${path}`,
      method: secret ? 'GET' : 'POST',
      data,
      headers: secret ? { 'X-QR-Secret': secret } : {},
      timeout: 10_000,
    });
    if (response.data?.code !== 0) {
      throw new QrLoginError(
        response.data?.message || '扫码登录失败，请刷新二维码',
        false,
      );
    }
    return response.data.data;
  } catch (error: any) {
    if (error instanceof QrLoginError) throw error;
    const status = error?.response?.status;
    throw new QrLoginError(
      error?.response?.data?.message || '连接失败，正在重试',
      !status || status === 409 || status === 429 || status >= 500,
    );
  }
}
const credentials = (ticket: QrLoginTicket) => ({
  id: ticket.id,
  browserSecret: ticket.browserSecret,
});
export const createQrLogin = () => call<QrLoginTicket>('');
export const getQrLoginStatus = (ticket: QrLoginTicket) =>
  call<{ expiresIn: number; status: QrLoginStatus }>(
    `/${ticket.id}/status`,
    undefined,
    ticket.browserSecret,
  );
export const consumeQrLogin = (ticket: QrLoginTicket) =>
  call<{ accessToken: string }>('/consume', credentials(ticket));
export const cancelQrLogin = (ticket: QrLoginTicket) =>
  call<void>('/cancel', credentials(ticket));
