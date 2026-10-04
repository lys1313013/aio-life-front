import type { Component } from 'vue';

import type { MembershipVO } from '#/api/membership';

import dayjs from 'dayjs';

export const BUSINESS_CARD_MAX_HEIGHT = 280;
export const BUSINESS_CARD_PAGE_SIZE = 20;

export interface BusinessCardItem {
  id: string;
  title: string;
  subtitle: string;
  detail?: string;
  icon?: string;
  emoji?: string;
  fileId?: string;
  coverUrl?: string;
  media?: boolean;
  autoRenew?: boolean;
  badge?: string;
  badgeUrgent?: boolean;
  membership?: boolean;
  inProgress?: boolean;
  record: unknown;
}

export interface BusinessCardPage {
  items: BusinessCardItem[];
  hasMore: boolean;
}

export function hasMoreRecords(
  total: string,
  page: number,
  size: number,
  received: number,
) {
  if (!/^\d+$/.test(total)) throw new Error('Invalid pagination total');
  return received > 0 && BigInt(page) * BigInt(size) < BigInt(total);
}

export function dateDistance(date: string, expired = false) {
  const days = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days === 0) return expired ? '今日到期' : '就是今天';
  return days > 0
    ? `还有 ${days} 天`
    : `${expired ? '已过期' : '已经'} ${Math.abs(days)} 天`;
}

export function sortMemberships(records: MembershipVO[]) {
  const today = dayjs().format('YYYY-MM-DD');
  return records
    .filter(
      (row) => row.status !== 'expired' && row.expiryDate.slice(0, 10) >= today,
    )
    .sort((a, b) => {
      const dateOrder = a.expiryDate.localeCompare(b.expiryDate);
      if (dateOrder !== 0) return dateOrder;
      return a.id.length === b.id.length
        ? b.id.localeCompare(a.id)
        : b.id.length - a.id.length;
    });
}

export interface HomeMenu {
  icon?: Component | string;
  iconColor?: string;
  path: string;
  menuId?: string;
  children?: HomeMenu[];
}
export function findMenuChain(
  menus: HomeMenu[],
  paths: string[],
  parents: HomeMenu[] = [],
): HomeMenu[] {
  for (const menu of menus) {
    const chain = [...parents, menu];
    if (paths.includes(menu.path)) return chain;
    const nested = findMenuChain(menu.children ?? [], paths, chain);
    if (nested.length > 0) return nested;
  }
  return [];
}
export function requirePinnedRows<T extends { isPinned?: number }>(
  rows: T[],
): T[] {
  if (rows.some((row) => row.isPinned !== 0 && row.isPinned !== 1))
    throw new Error('Home pin API is not ready');
  return rows.filter((row) => row.isPinned === 1);
}
