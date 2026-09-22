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
}

export async function queryActivityLogs(
  type: ActivityLogType,
  params: ActivityLogQuery,
) {
  return requestClient.get<{ items: ActivityLog[]; total: number }>(
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
      reason = JSON.parse(text).result || reason;
    } catch {
      // 非 JSON 响应使用统一提示。
    }
    throw new Error(reason);
  }
  return blob;
}
