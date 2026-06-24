import { requestClient } from '#/api/request';
import type { FileVO } from '../core/common';

/**
 * 衣物请求 DTO
 */
export interface WardrobeItemReq {
  id?: number;
  name: string;
  categoryId?: number;
  color?: string;
  brand?: string;
  season?: string[];
  purchaseDate?: string;
  price?: number;
  fileIds?: string[];
  size?: string;
  memo?: string;
}

/**
 * 衣物 VO
 */
export interface WardrobeItemVO {
  id: number;
  name: string;
  categoryId?: number;
  categoryName?: string;
  color?: string;
  brand?: string;
  season?: string;
  purchaseDate?: string;
  price?: number;
  files?: FileVO[];
  size?: string;
  memo?: string;
  createTime?: string;
}

/**
 * 分类请求 DTO
 */
export interface CategoryReq {
  id?: number;
  name: string;
  icon?: string;
  parentId?: number;
  sort?: number;
}

/**
 * 分类 VO
 */
export interface CategoryVO {
  id: number;
  name: string;
  icon?: string;
  parentId?: number;
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
  categoryId?: number;
  keyword?: string;
  season?: string;
}) {
  return requestClient.get<WardrobeItemVO[]>('/wardrobe/items', { params });
}

/**
 * 获取衣物详情
 */
export async function getWardrobeItem(id: number) {
  return requestClient.get<WardrobeItemVO>(`/wardrobe/items/${id}`);
}

/**
 * 保存衣物
 */
export async function saveWardrobeItem(data: WardrobeItemReq) {
  return requestClient.post('/wardrobe/items', data);
}

/**
 * 更新衣物
 */
export async function updateWardrobeItem(id: number, data: WardrobeItemReq) {
  return requestClient.put(`/wardrobe/items/${id}`, data);
}

/**
 * 删除衣物
 */
export async function deleteWardrobeItem(id: number) {
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
  return requestClient.upload<FileVO>('/wardrobe/upload-photo', { file });
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
export async function saveCategory(data: CategoryReq) {
  return requestClient.post('/wardrobe/categories', data);
}

/**
 * 更新分类
 */
export async function updateCategory(id: number, data: CategoryReq) {
  return requestClient.put(`/wardrobe/categories/${id}`, data);
}

/**
 * 删除分类
 */
export async function deleteCategory(id: number) {
  return requestClient.delete(`/wardrobe/categories/${id}`);
}
