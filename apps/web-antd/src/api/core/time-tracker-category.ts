import { requestClient } from '#/api/request';

/**
 * 时间追踪分类实体
 */
export interface TimeTrackerCategoryEntity {
  id?: string;
  userId?: string;
  templateId?: null | string;
  parentId?: null | string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  isTrackTime?: number;
  sort?: number;
  isDeleted?: number;
  isEnabled?: number;
  timeType?: 1 | 2 | 3; // 时间类型: 1-必须, 2-积极, 3-休闲
  // 客户端计算字段（不发送到后端）
  _categoryType?: 'override' | 'private' | 'public';
  _originalName?: string;
  _isHidden?: boolean;
}

/**
 * 获取所有分类（含合并的公共分类）
 */
export async function listCategories(
  includeHidden = false,
): Promise<TimeTrackerCategoryEntity[]> {
  return await requestClient.get(
    includeHidden ? '/timeTrackerCategory/all' : '/timeTrackerCategory/list',
  );
}

/**
 * 获取隐藏的分类列表
 */
export async function listHiddenCategories(): Promise<
  TimeTrackerCategoryEntity[]
> {
  return await requestClient.get('/timeTrackerCategory/hidden');
}

/**
 * 保存分类
 */
export async function saveCategory(
  data: TimeTrackerCategoryEntity,
): Promise<boolean> {
  return await requestClient.post('/timeTrackerCategory', data);
}

/**
 * 更新分类
 */
export async function updateCategory(
  data: TimeTrackerCategoryEntity,
): Promise<boolean> {
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
export async function reSortCategories(
  list: { id?: string; sort?: number; templateId?: null | string }[],
): Promise<void> {
  return await requestClient.post('/timeTrackerCategory/reSort', list);
}

// ================= 管理员 API =================

export async function adminListCategories(): Promise<
  TimeTrackerCategoryEntity[]
> {
  return await requestClient.get('/timeTrackerCategory/admin/list');
}

export async function adminSaveCategory(
  data: TimeTrackerCategoryEntity,
): Promise<boolean> {
  return await requestClient.post('/timeTrackerCategory/admin', data);
}

export async function adminUpdateCategory(
  data: TimeTrackerCategoryEntity,
): Promise<boolean> {
  return await requestClient.put(`/timeTrackerCategory/admin/${data.id}`, data);
}

export async function adminDeleteCategory(id: string): Promise<boolean> {
  return await requestClient.delete(`/timeTrackerCategory/admin/${id}`);
}
