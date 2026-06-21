import { get, post, request } from '../utils/request';

export interface WardrobeItemReq {
  id?: number;
  name: string;
  categoryId?: number;
  color?: string;
  brand?: string;
  season?: string[];
  purchaseDate?: string;
  price?: number;
  photoUrls?: string[];
  size?: string;
  memo?: string;
}

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
  photoUrls?: string[];
  size?: string;
  memo?: string;
  createTime?: string;
}

export interface CategoryReq {
  id?: number;
  name: string;
  icon?: string;
  parentId?: number;
  sort?: number;
}

export interface CategoryVO {
  id: number;
  name: string;
  icon?: string;
  parentId?: number;
  sort?: number;
  categoryType?: number;
  children?: CategoryVO[];
}

export interface WardrobeStatsVO {
  totalCount: number;
  categoryCount: Record<string, number>;
  seasonCount: Record<string, number>;
  totalValue: number;
  avgPrice: number;
}

export function getWardrobeItems(params: {
  categoryId?: number;
  keyword?: string;
  season?: string;
}) {
  return get<WardrobeItemVO[]>('/wardrobe/items', params);
}

export function getWardrobeItem(id: number) {
  return get<WardrobeItemVO>(`/wardrobe/items/${id}`);
}

export function saveWardrobeItem(data: WardrobeItemReq) {
  return post('/wardrobe/items', data);
}

export function updateWardrobeItem(id: number, data: WardrobeItemReq) {
  return request({ url: `/wardrobe/items/${id}`, method: 'PUT', data });
}

export function deleteWardrobeItem(id: number) {
  return request({ url: `/wardrobe/items/${id}`, method: 'DELETE' });
}

export function getWardrobeStats() {
  return get<WardrobeStatsVO>('/wardrobe/stats');
}

export function getCategories() {
  return get<CategoryVO[]>('/wardrobe/categories');
}

export function saveCategory(data: CategoryReq) {
  return post('/wardrobe/categories', data);
}

export function updateCategory(id: number, data: CategoryReq) {
  return request({ url: `/wardrobe/categories/${id}`, method: 'PUT', data });
}

export function deleteCategory(id: number) {
  return request({ url: `/wardrobe/categories/${id}`, method: 'DELETE' });
}
