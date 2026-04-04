import { requestClient } from '#/api/request';

/**
 * 获取 API Key 列表
 */
export async function getApiKeyListApi() {
  return requestClient.get<any[]>('/api-key/list');
}

/**
 * 生成 API Key
 * @param params { remark: string, expireDays: number }
 */
export async function generateApiKeyApi(params: {
  expireDays?: number;
  remark?: string;
}) {
  return requestClient.post<any>('/api-key/generate', params);
}

/**
 * 删除 API Key
 * @param id API Key ID
 */
export async function deleteApiKeyApi(id: number | string) {
  return requestClient.delete(`/api-key/${id}`);
}
