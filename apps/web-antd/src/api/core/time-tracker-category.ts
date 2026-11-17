import type { ApiRequests } from '#/api/payload';

import { pickPayload, pickPayloadList } from '#/api/payload';
import { requestClient } from '#/api/request';

/**
 * 时间追踪分类实体
 */
export interface TimeTrackerCategoryEntity {
  id?: string;
  preset?: boolean;
  templateId?: null | string;
  parentId?: null | string;
  inheritParent?: boolean;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  isTrackTime?: number;
  sortOrder?: number;
  isEnabled?: number;
  isHidden?: boolean;
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
  data: ApiRequests['TimeTrackerCategoryCreateReq'],
): Promise<boolean> {
  return await requestClient.post(
    '/timeTrackerCategory',
    pickPayload('TimeTrackerCategoryCreateReq', normalizeParent(data)),
  );
}

/**
 * 更新分类
 */
export async function updateCategory(
  data: ApiRequests['TimeTrackerCategoryUpdateReq'],
): Promise<boolean> {
  return await requestClient.put(
    '/timeTrackerCategory',
    pickPayload('TimeTrackerCategoryUpdateReq', normalizeParent(data)),
  );
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
  list: ApiRequests['TimeTrackerCategorySortReq'][],
): Promise<void> {
  return await requestClient.post(
    '/timeTrackerCategory/reSort',
    pickPayloadList('TimeTrackerCategorySortReq', list),
  );
}

function normalizeParent<T extends { parentId?: null | string }>(data: T): T {
  return data.parentId === '' ? { ...data, parentId: null } : data;
}

// ================= 管理员 API =================

export async function adminListCategories(): Promise<
  TimeTrackerCategoryEntity[]
> {
  return await requestClient.get('/timeTrackerCategory/admin/list');
}

export async function adminSaveCategory(
  data: ApiRequests['TimeTrackerCategoryAdminCreateReq'],
): Promise<boolean> {
  return await requestClient.post(
    '/timeTrackerCategory/admin',
    pickPayload('TimeTrackerCategoryAdminCreateReq', normalizeParent(data)),
  );
}

export async function adminUpdateCategory(
  data: ApiRequests['TimeTrackerCategoryAdminUpdateReq'] & { id: string },
): Promise<boolean> {
  return await requestClient.put(
    `/timeTrackerCategory/admin/${data.id}`,
    pickPayload('TimeTrackerCategoryAdminUpdateReq', normalizeParent(data)),
  );
}

export async function adminDeleteCategory(id: string): Promise<boolean> {
  return await requestClient.delete(`/timeTrackerCategory/admin/${id}`);
}
