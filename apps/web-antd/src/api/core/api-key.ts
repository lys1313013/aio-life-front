import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface ApiKeyVO {
  id: string;
  apiKey: string;
  remark: null | string;
  expiredAt: null | string;
  createTime: string;
  isExpired: boolean;
}

/**
 * 获取 API Key 列表
 */
export async function getApiKeyListApi() {
  return requestClient.get<ApiKeyVO[]>('/api-key/list');
}

/**
 * 生成 API Key
 * @param params { remark: string, expireDays: number }
 */
export async function generateApiKeyApi(
  params: ApiRequests['ApiKeyGenerateReq'],
) {
  return requestClient.post<{ apiKey: string }>(
    '/api-key/generate',
    pickPayload('ApiKeyGenerateReq', params),
  );
}

/**
 * 删除 API Key
 * @param id API Key ID
 */
export async function deleteApiKeyApi(id: string) {
  return requestClient.delete(`/api-key/${id}`);
}

/** 修改备注，密钥和有效期保持不变。 */
export async function updateApiKeyApi(
  id: string,
  params: ApiRequests['ApiKeyUpdateReq'],
) {
  return requestClient.put<ApiKeyVO>(
    `/api-key/${encodeURIComponent(id)}`,
    pickPayload('ApiKeyUpdateReq', params),
  );
}
