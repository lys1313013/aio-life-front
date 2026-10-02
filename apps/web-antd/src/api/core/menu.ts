import type { RouteRecordStringComponent } from '@vben/types';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

/**
 * 获取用户所有菜单
 */
export async function getAllMenusApi() {
  return requestClient.get<RouteRecordStringComponent[]>('/menu/all');
}

export interface UserMenuOption {
  children: UserMenuOption[];
  id: string;
  title: string;
}

export interface UserMenuPreference {
  hiddenMenuIds: string[];
  menus: UserMenuOption[];
}

export async function getMenuPreferencesApi() {
  return requestClient.get<UserMenuPreference>('/menu/preferences');
}

export async function saveMenuPreferencesApi(menuIds: string[]) {
  return requestClient.put<UserMenuPreference>(
    '/menu/preferences',
    pickPayload('UserMenuHiddenSaveReq', {
      menuIds,
    }),
  );
}

export async function resetMenuPreferencesApi() {
  return requestClient.delete<UserMenuPreference>('/menu/preferences');
}

export interface SysMenuAdminItem {
  children?: SysMenuAdminItem[];
  component?: string;
  iconColor?: string;
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
  iconColor?: string;
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

export async function createMenuApi(data: ApiRequests['MenuSaveReq']) {
  return requestClient.post<SysMenuAdminItem>(
    '/menu/admin',
    pickPayload('MenuSaveReq', data),
  );
}

export async function updateMenuApi(
  id: string,
  data: ApiRequests['MenuSaveReq'],
) {
  return requestClient.put<SysMenuAdminItem>(
    `/menu/admin/${id}`,
    pickPayload('MenuSaveReq', data),
  );
}

export async function updateMenuStatusApi(id: string, status: number) {
  return requestClient.put<SysMenuAdminItem>(
    `/menu/admin/${id}/status`,
    pickPayload('MenuStatusUpdateReq', {
      status,
    }),
  );
}

export async function updateMenuSortApi(id: string, sort: number) {
  return requestClient.put<SysMenuAdminItem>(
    `/menu/admin/${id}/sort`,
    pickPayload('MenuSortUpdateReq', {
      sort,
    }),
  );
}

export async function deleteMenuApi(id: string) {
  return requestClient.delete<void>(`/menu/admin/${id}`);
}
