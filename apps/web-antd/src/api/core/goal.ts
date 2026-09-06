import type { ProgressStatus } from './progress-status';

import { requestClient } from '#/api/request';

export interface GoalEntity {
  id?: number;
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
export async function createGoal(data: GoalEntity) {
  return requestClient.post<GoalEntity>('/goals', data);
}

/**
 * 更新目标
 */
export async function updateGoal(data: GoalEntity) {
  return requestClient.put<GoalEntity>('/goals', data);
}

/**
 * 批量删除目标
 */
export async function deleteGoals(ids: number[]) {
  return requestClient.post<void>('/goals/batchDelete', { idList: ids });
}
