import type { ProgressStatus } from './progress-status';
import { goalDisplayStatus } from './goal-progress';
export { goalDisplayStatus };
export { goalAchieved, goalProgressPercent } from './goal-progress';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface GoalEntity {
  id?: string;
  isPinned?: 0 | 1;
  pinnedSortOrder?: number;
  title: string;
  type: number; // 1: 日, 2: 周, 3: 月, 4: 季度, 5: 半年, 6: 年度, 7～10: 长期目标
  status: ProgressStatus;
  progress: number;
  progressMode?: 'manual' | 'graphql';
  progressQuery?: string;
  progressVariables?: string;
  progressVariableBindings?: string;
  progressValuePath?: string;
  targetOperator?: 'gte' | 'gt';
  progressCheckedAt?: string;
  progressVersion?: string;
  progressError?: string;
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
  const { status, ...query } = params ?? {};
  const rows = await requestClient.get<GoalEntity[]>('/goals', {
    params: query,
  });
  const updated = await refreshGoalRows(rows);
  return status
    ? updated.filter((row) => goalDisplayStatus(row) === status)
    : updated;
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

export async function refreshGoalRows(rows: GoalEntity[]) {
  const automatic = rows.filter(
    (row) => row.progressMode === 'graphql' && row.id,
  );
  const updated = new Map<string, GoalEntity>();
  for (let offset = 0; offset < automatic.length; offset += 10) {
    const batch = automatic.slice(offset, offset + 10);
    try {
      const result = await requestClient.post<GoalEntity[]>(
        '/goals/progress/refresh',
        pickPayload('GoalProgressRefreshReq', {
          ids: batch.map((row) => row.id!),
        }),
      );
      for (const item of result) if (item.id) updated.set(item.id, item);
    } catch {
      for (const row of batch)
        updated.set(row.id!, { ...row, progressError: '进度更新失败，请重试' });
    }
  }
  return rows.map((row) => updated.get(row.id!) ?? row);
}
export interface GoalProgressPreview {
  currentValue: number;
  achieved: boolean;
  progressPercent: number;
  variables: Record<string, unknown>;
}
export function previewGoalProgress(
  data: ApiRequests['GoalProgressPreviewReq'],
) {
  return requestClient.post<GoalProgressPreview>(
    '/goals/progress/preview',
    pickPayload('GoalProgressPreviewReq', data),
  );
}
