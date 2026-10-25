import type { ScheduledJobUpdateReq } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface ScheduledJobVO {
  id: string;
  jobCode: string;
  name: string;
  cron: string;
  zoneId: string;
  enabled: boolean;
  revision: number;
  schedulerEnabled: boolean;
  nextExecutionTime: null | string;
}

export interface ScheduledJobLogVO {
  id: string;
  jobId: string;
  triggerType: 'AUTO' | 'MANUAL';
  status: 'FAILED' | 'INTERRUPTED' | 'RUNNING' | 'SKIPPED' | 'SUCCESS';
  scheduledTime: null | string;
  startTime: string;
  endTime: null | string;
  durationMs: null | string;
  message: null | string;
  createUser: null | string;
}

export type ScheduledJobUpdateRequest = ScheduledJobUpdateReq;

export async function queryScheduledJobs() {
  return await requestClient.get<ScheduledJobVO[]>('/system/scheduled-jobs');
}

export async function updateScheduledJob(
  id: string,
  data: ScheduledJobUpdateRequest,
) {
  return await requestClient.put<ScheduledJobVO>(
    `/system/scheduled-jobs/${id}`,
    pickPayload('ScheduledJobUpdateReq', data),
  );
}

export async function runScheduledJob(id: string) {
  return await requestClient.post<void>(`/system/scheduled-jobs/${id}/run`);
}

export async function queryScheduledJobLogs(
  id: string,
  page: number,
  pageSize = 20,
) {
  return await requestClient.get<{ items: ScheduledJobLogVO[]; total: number }>(
    `/system/scheduled-jobs/${id}/logs`,
    { params: { page, pageSize } },
  );
}
