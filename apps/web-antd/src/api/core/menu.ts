import type { RouteRecordStringComponent } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/menu/all');
}

export interface SysMenuAdminItem {
  children?: SysMenuAdminItem[];
  component?: string;
  id: string;
  meta?: Record<string, any>;
  name: string;
  parentId: string;
  path: string;
  redirect?: string;
  roles?: string;
  sort?: number;
  status?: number;
}

export interface SysMenuSaveReq {
  component?: string;
  id?: string;
  meta?: Record<string, any>;
  name: string;
  parentId?: string;
  path: string;
  redirect?: string;
  roles?: string;
  sort?: number;
  status?: number;
}

export async function getMenuAdminTreeApi() {
  return requestClient.get<SysMenuAdminItem[]>('/menu/admin/tree');
}

export async function getMenuRoleOptionsApi() {
  return requestClient.get<string[]>('/menu/admin/role-options');
}

export async function createMenuApi(data: SysMenuSaveReq) {
  return requestClient.post<SysMenuAdminItem>('/menu/admin', data);
}

export async function updateMenuApi(id: string, data: SysMenuSaveReq) {
  return requestClient.put<SysMenuAdminItem>(`/menu/admin/${id}`, data);
}

export async function updateMenuStatusApi(id: string, status: number) {
  return requestClient.put<SysMenuAdminItem>(`/menu/admin/${id}/status`, {
    status,
  });
}

export async function deleteMenuApi(id: string) {
  return requestClient.delete<void>(`/menu/admin/${id}`);
}
