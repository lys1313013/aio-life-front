import { requestClient } from '#/api/request';

/**
 * 时间追踪分类实体
 */
export interface TimeTrackerCategoryEntity {
  id?: string;
  userId?: number;
  code?: string;
  name: string;
  color: string;
  description?: string;
  isTrackTime?: number;
  sort?: number;
}

/**
 * 获取所有分类
 */
export async function listCategories(): Promise<TimeTrackerCategoryEntity[]> {
  return await requestClient.get('/timeTrackerCategory/list');
}

/**
 * 保存分类
 */
export async function saveCategory(data: TimeTrackerCategoryEntity): Promise<boolean> {
  return await requestClient.post('/timeTrackerCategory', data);
}

/**
 * 更新分类
 */
export async function updateCategory(data: TimeTrackerCategoryEntity): Promise<boolean> {
  return await requestClient.put('/timeTrackerCategory', data);
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<boolean> {
  return await requestClient.delete(`/timeTrackerCategory/${id}`);
}

/**
 * 拖拽排序
 */
export async function reSortCategories(list: { id?: string; sort?: number }[]): Promise<void> {
  return await requestClient.post('/timeTrackerCategory/reSort', list);
}
