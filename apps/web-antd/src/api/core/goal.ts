import type { ProgressStatus } from './progress-status';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface GoalEntity {
  id?: string;
  isPinned?: 0 | 1;
  pinnedSort?: number;
  title: string;
  type: number; // 1: 年, 2: 月, 3: 日
  status: ProgressStatus;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  description?: string;
  content?: string;
  startDate?: string;
  endDate?: string;
  tags?: string;
  [key: string]: any;
}

export interface GoalQueryParams {
  isPinned?: 0 | 1;
  type?: number;
  status?: ProgressStatus;
  keyword?: string;
}

/**
 * 获取目标列表
 */
export async function getGoalList(params?: GoalQueryParams) {
  return requestClient.get<GoalEntity[]>('/goals', { params });
}

/**
 * 新增目标
 */
export async function createGoal(data: ApiRequests['GoalCreateReq']) {
  return requestClient.post<GoalEntity>(
    '/goals',
    pickPayload('GoalCreateReq', data),
  );
}

/**
 * 更新目标
 */
export async function updateGoal(data: ApiRequests['GoalUpdateReq']) {
  return requestClient.put<GoalEntity>(
    '/goals',
    pickPayload('GoalUpdateReq', data),
  );
}

/**
 * 批量删除目标
 */
export async function deleteGoals(ids: string[]) {
  return requestClient.post<void>(
    '/goals/batchDelete',
    pickPayload('CommonReq', { idList: ids }),
  );
}

export async function setGoalPinned(id: string, isPinned: 0 | 1) {
  return requestClient.put<GoalEntity>(
    `/goals/${id}/pin`,
    pickPayload('HomePinReq', { isPinned }),
  );
}

export async function updateGoalPinnedOrder(ids: string[]) {
  return requestClient.put<void>(
    '/goals/pinned-order',
    pickPayload('HomePinnedOrderReq', { ids }),
  );
}
