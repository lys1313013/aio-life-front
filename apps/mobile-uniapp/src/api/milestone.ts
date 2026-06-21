import { get, post, put } from "../utils/request";

export interface MilestoneEntity {
  id?: number;
  userId?: number;
  title: string;
  description?: string;
  date: string;
  end_date?: string;
  type: string;
  tags?: string;
  createTime?: string;
  updateTime?: string;
  createUser?: number;
  updateUser?: number;
  isDeleted?: number;
}

export async function queryMilestone() {
  return await get<MilestoneEntity[]>('/milestones');
}

export async function createMilestone(data: MilestoneEntity) {
  return await post<MilestoneEntity>('/milestones', data);
}

export async function updateMilestone(data: MilestoneEntity) {
  return await put<MilestoneEntity>('/milestones', data);
}

export async function deleteMilestone(idList: number[]) {
  return await post<void>('/milestones/batchDelete', { idList });
}
