import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

/**
 * Milestone 实体接口
 * 对应后端 MilestoneEntity
 */
export interface MilestoneEntity {
  id?: string;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  type: string;
  tags?: string; // JSON string
  createTime?: string;
  updateTime?: string;
}

/**
 * 查询
 */
export async function queryMilestone() {
  return await requestClient.get<MilestoneEntity[]>('/milestones');
}

/**
 * 创建
 */
export async function createMilestone(data: ApiRequests['MilestoneCreateReq']) {
  return await requestClient.post<MilestoneEntity>(
    '/milestones',
    pickPayload('MilestoneCreateReq', data),
  );
}

/**
 * 更新
 */
export async function updateMilestone(data: ApiRequests['MilestoneUpdateReq']) {
  return await requestClient.put<MilestoneEntity>(
    '/milestones',
    pickPayload('MilestoneUpdateReq', data),
  );
}

/**
 * 批量删除
 */
export async function deleteMilestone(idList: string[]) {
  return await requestClient.post<void>(
    '/milestones/batchDelete',
    pickPayload('CommonReq', { idList }),
  );
}
