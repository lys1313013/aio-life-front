import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export interface ExportDataset {
  key: string;
  title: string;
  state: 'AVAILABLE' | 'LOCKED' | 'UNAVAILABLE';
  lockedMenu: null | string;
}
export interface ExportCatalog {
  artifactHours: number;
  version: string;
  datasets: ExportDataset[];
  verificationMethod: 'PASSWORD' | 'SECONDARY_PASSWORD';
  exclusions: string[];
}
export interface ExportQuota {
  month: string;
  limit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}
export interface ExportJob {
  id: string;
  status: string;
  phase: string;
  errorCode: null | string;
  rowCount: number;
  fileBytes: null | string;
  fileName: null | string;
  sha256: null | string;
  artifactStatus: string;
  createTime: string;
  finishedAt: null | string;
  expiresAt: null | string;
}
export interface ExportAudit {
  id: string;
  userId: null | string;
  jobId: null | string;
  eventType: string;
  resultCode: string;
  eventTime: string;
  clientIp: null | string;
}
export const exportPath = '/me/data-exports';
export async function getExportCatalog() {
  return requestClient.get<ExportCatalog>(`${exportPath}/catalog`);
}
export async function getExportQuota() {
  return requestClient.get<ExportQuota>(`${exportPath}/quota`);
}
export async function getExportJobs(page = 1) {
  return requestClient.get<{ items: ExportJob[]; total: number }>(exportPath, {
    params: { page, pageSize: 20 },
  });
}
export async function authorizeExport(data: {
  datasetKeys?: string[];
  jobId?: string;
  password: string;
  purpose: 'CREATE' | 'DOWNLOAD';
}) {
  return requestClient.post<{ grant: string }>(
    `${exportPath}/authorizations`,
    data,
  );
}
export async function createExport(
  data: { catalogVersion: string; datasetKeys: string[] },
  key: string,
  grant: string,
) {
  return requestClient.post<ExportJob>(exportPath, data, {
    headers: { 'Idempotency-Key': key, 'X-Export-Grant': grant },
  });
}
export async function cancelExport(id: string) {
  return requestClient.post<void>(
    `${exportPath}/${encodeURIComponent(id)}/cancel`,
  );
}
export async function deleteExportArtifact(id: string) {
  return requestClient.delete<void>(
    `${exportPath}/${encodeURIComponent(id)}/artifact`,
  );
}
export async function getExportAudits(page = 1) {
  return requestClient.get<{ items: ExportAudit[]; total: number }>(
    '/system/data-export-audits',
    { params: { page, pageSize: 20 } },
  );
}

/** 文件传输不自动重试，也不将凭据加入 URL；错误 JSON 不能保存成 Excel。 */
export async function downloadExport(
  id: string,
  grant: string,
  signal?: AbortSignal,
) {
  const access = useAccessStore();
  const token = access.accessToken;
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const response = await fetch(
    `${apiURL.replace(/\/$/, '')}${exportPath}/${encodeURIComponent(id)}/download`,
    {
      headers: { Authorization: `Bearer ${token}`, 'X-Export-Grant': grant },
      cache: 'no-store',
      signal,
    },
  );
  const type = response.headers.get('content-type') || '';
  if (
    !response.ok ||
    ![
      'application/zip',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ].some((value) => type.startsWith(value))
  ) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || '下载失败，请重新核验后重试');
  }
  const blob = await response.blob();
  if (access.accessToken !== token || signal?.aborted)
    throw new Error('登录状态已变化，已取消下载');
  return blob;
}
