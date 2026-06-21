import { get, post, request } from '../utils/request';

export interface GoalEntity {
  id?: number;
  title: string;
  type: number; // 1: 年, 2: 月, 3: 日
  status: number; // 0: 待开始, 1: 进行中, 2: 已完成, 3: 已放弃
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
  status?: number;
  keyword?: string;
}

/**
 * 获取目标列表
 */
export function getGoalList(params?: GoalQueryParams) {
  return get<GoalEntity[]>('/goals', params);
}

/**
 * 新增目标
 */
export function createGoal(data: GoalEntity) {
  return post<GoalEntity>('/goals', data);
}

/**
 * 更新目标
 */
export function updateGoal(data: GoalEntity) {
  return request<GoalEntity>({ url: '/goals', method: 'PUT', data });
}

/**
 * 批量删除目标
 */
export function deleteGoals(ids: number[]) {
  return post<void>('/goals/batchDelete', { idList: ids });
}
