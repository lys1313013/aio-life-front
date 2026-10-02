import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from '../core/common';

/**
 * 衣物请求 DTO
 */
export interface WardrobeItemReq {
  id?: string;
  name: string;
  categoryId?: string;
  color?: string;
  brand?: string;
  season?: string[];
  purchaseDate?: string;
  price?: number;
  fileId?: string;
  size?: string;
  memo?: string;
}

/**
 * 衣物 VO
 */
export interface WardrobeItemVO {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  color?: string;
  brand?: string;
  season?: string;
  purchaseDate?: string;
  price?: number;
  fileId?: string;
  size?: string;
  memo?: string;
  createTime?: string;
}

/**
 * 分类请求 DTO
 */
export interface CategoryReq {
  id?: string;
  name: string;
  icon?: string;
  parentId?: string;
  sort?: number;
}

/**
 * 分类 VO
 */
export interface CategoryVO {
  id: string;
  name: string;
  icon?: string;
  parentId?: string;
  sort?: number;
  categoryType?: number;
  children?: CategoryVO[];
}

/**
 * 统计数据 VO
 */
export interface WardrobeStatsVO {
  totalCount: number;
  categoryCount: Record<string, number>;
  seasonCount: Record<string, number>;
  totalValue: number;
  avgPrice: number;
}

// ==================== 衣物接口 ====================

/**
 * 查询衣物列表
 */
export async function getWardrobeItems(params: {
  categoryId?: string;
  keyword?: string;
  season?: string;
}) {
  return requestClient.get<WardrobeItemVO[]>('/wardrobe/items', { params });
}

/**
 * 获取衣物详情
 */
export async function getWardrobeItem(id: string) {
  return requestClient.get<WardrobeItemVO>(`/wardrobe/items/${id}`);
}

/**
 * 保存衣物
 */
export async function saveWardrobeItem(
  data: ApiRequests['WardrobeItemSaveReq'],
) {
  return requestClient.post(
    '/wardrobe/items',
    pickPayload('WardrobeItemSaveReq', data),
  );
}

/**
 * 更新衣物
 */
export async function updateWardrobeItem(
  id: string,
  data: ApiRequests['WardrobeItemSaveReq'],
) {
  return requestClient.put(
    `/wardrobe/items/${id}`,
    pickPayload('WardrobeItemSaveReq', data),
  );
}

/**
 * 删除衣物
 */
export async function deleteWardrobeItem(id: string) {
  return requestClient.delete(`/wardrobe/items/${id}`);
}

/**
 * 获取统计数据
 */
export async function getWardrobeStats() {
  return requestClient.get<WardrobeStatsVO>('/wardrobe/stats');
}

/**
 * 上传衣物照片
 */
export async function uploadWardrobePhoto(file: File) {
  return uploadFile(file, FILE_BIZ_TYPE.WARDROBE_ITEM);
}

// ==================== 分类接口 ====================

/**
 * 获取分类列表
 */
export async function getCategories() {
  return requestClient.get<CategoryVO[]>('/wardrobe/categories');
}

/**
 * 保存分类
 */
export async function saveCategory(
  data: ApiRequests['WardrobeCategorySaveReq'],
) {
  return requestClient.post(
    '/wardrobe/categories',
    pickPayload('WardrobeCategorySaveReq', data),
  );
}

/**
 * 更新分类
 */
export async function updateCategory(
  id: string,
  data: ApiRequests['WardrobeCategorySaveReq'],
) {
  return requestClient.put(
    `/wardrobe/categories/${id}`,
    pickPayload('WardrobeCategorySaveReq', data),
  );
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string) {
  return requestClient.delete(`/wardrobe/categories/${id}`);
}
