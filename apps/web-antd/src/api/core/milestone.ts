import { requestClient } from '#/api/request';

/**
 * Milestone 实体接口
 * 对应后端 MilestoneEntity
 */
export interface MilestoneEntity {
  id?: number;
  userId?: number;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  type: string;
  tags?: string; // JSON string
  createTime?: string;
  updateTime?: string;
  createUser?: number;
  updateUser?: number;
  isDeleted?: number;
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
export async function createMilestone(data: MilestoneEntity) {
  return await requestClient.post<MilestoneEntity>('/milestones', data);
}

/**
 * 更新
 */
export async function updateMilestone(data: MilestoneEntity) {
  return await requestClient.put<MilestoneEntity>('/milestones', data);
}

/**
 * 批量删除
 */
export async function deleteMilestone(idList: number[]) {
  return await requestClient.post<void>('/milestones/batchDelete', { idList });
}
