import { requestClient } from '#/api/request';

export interface QuickNavCandidate {
  color?: string;
  icon: string;
  menuId: string;
  parentTitle?: string;
  path: string;
  target: 'blank' | 'self';
  title: string;
}

export interface QuickNavItem {
  color?: string;
  enabled: number;
  icon: string;
  menuId: string;
  path: string;
  sortOrder: number;
  target: 'blank' | 'self';
  title: string;
}

export interface QuickNavSaveItem {
  enabled: number;
  menuId: string;
  sortOrder: number;
}

export const QUICK_NAV_MAX = 12;

export async function getQuickNavCandidatesApi() {
  return requestClient.get<QuickNavCandidate[]>('/quick-nav/candidates');
}

export async function getMyQuickNavApi() {
  return requestClient.get<QuickNavItem[]>('/quick-nav/my');
}

export async function saveMyQuickNavApi(items: QuickNavSaveItem[]) {
  return requestClient.post<QuickNavItem[]>('/quick-nav/my', { items });
}
