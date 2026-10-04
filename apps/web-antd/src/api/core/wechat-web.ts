import { requestClient } from '#/api/request';

export interface WechatWebCredentials {
  scene: string;
  browserSecret: string;
}

export interface WechatWebChallenge extends WechatWebCredentials {
  qrCode: string;
  expiresIn: number;
}

export type WechatWebStatus =
  | 'CANCELLED'
  | 'CONFIRMED'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'SCANNED'
  | 'WAITING';

export async function getWechatWebCapabilities() {
  return requestClient.get<{ enabled: boolean }>(
    '/auth/wechat/web/capabilities',
  );
}

export async function createWechatWebLogin() {
  return requestClient.post<WechatWebChallenge>('/auth/wechat/web/create');
}

// 密钥只放在请求体，不放进二维码、URL、路由或持久化存储。
function credentials(value: WechatWebCredentials) {
  return { scene: value.scene, browserSecret: value.browserSecret };
}

export async function getWechatWebStatus(value: WechatWebCredentials) {
  return requestClient.post<{ status: WechatWebStatus }>(
    '/auth/wechat/web/status',
    credentials(value),
  );
}

export async function exchangeWechatWebLogin(value: WechatWebCredentials) {
  return requestClient.post<{ accessToken: string }>(
    '/auth/wechat/web/exchange',
    credentials(value),
  );
}

export async function revokeWechatWebLogin(value: WechatWebCredentials) {
  return requestClient.post('/auth/wechat/web/revoke', credentials(value));
}
