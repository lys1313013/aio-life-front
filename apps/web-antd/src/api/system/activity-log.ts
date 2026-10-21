import { requestClient } from '#/api/request';

export type ActivityLogType = 'access' | 'operation';

export interface ActivityLogQuery {
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  username?: string;
}

export interface ActivityLog {
  accessType: string;
  browser: string;
  createTime: string;
  functionItem: string;
  functionName: string;
  id: string;
  ipAddress: string;
  nickname: string;
  success: boolean;
  username: string;
  userId?: null | string;
  requestPath?: null | string;
  requestMethod: null | string;
  requestTime: null | string;
  durationMs: null | number;
  serverIp: null | string;
}

export async function queryActivityLogs(
  type: ActivityLogType,
  params: ActivityLogQuery,
) {
  return requestClient.get<{ items: ActivityLog[]; total: null | number }>(
    `/system/logs/${type}`,
    { params },
  );
}

export async function exportActivityLogs(
  type: ActivityLogType,
  params: ActivityLogQuery,
) {
  const blob = await requestClient.get<Blob>(`/system/logs/${type}/export`, {
    params,
    responseReturn: 'body',
    responseType: 'blob',
    timeout: 120_000,
  });
  // 业务异常可能返回 HTTP 200 JSON，不能当作 CSV 下载。
  if (!blob.type.includes('text/csv')) {
    const text = await blob.text();
    let reason = '导出失败，请重试';
    try {
      reason = JSON.parse(text).message || reason;
    } catch {
      // 非 JSON 响应使用统一提示。
    }
    const error = new Error(reason);
    error.name = 'ActivityLogExportError';
    throw error;
  }
  return blob;
}

export interface ActivityLogDetail extends ActivityLog {
  requestParams: null | Record<string, unknown>;
}

export function readOperationLog(id: string) {
  return requestClient.get<ActivityLogDetail>(`/system/logs/operation/${id}`);
}
