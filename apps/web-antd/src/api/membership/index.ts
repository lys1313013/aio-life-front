import { requestClient } from '#/api/request';

/**
 * 会员请求 DTO
 */
export interface MembershipReq {
  id?: string;
  name: string;
  category?: string;
  provider?: string;
  icon?: string;
  color?: string;
  startDate?: string;
  expiryDate: string;
  price?: number;
  autoRenew?: number;
  note?: string;
}

/**
 * 会员 VO
 */
export interface MembershipVO {
  id: string;
  name: string;
  category?: string;
  provider?: string;
  icon?: string;
  color?: string;
  startDate?: string;
  expiryDate: string;
  price?: number;
  autoRenew?: number;
  note?: string;
  /** active-生效中 expiring-即将到期 expired-已过期 */
  status: 'active' | 'expiring' | 'expired';
  /** 剩余天数，已过期为负数 */
  remainingDays: number;
}

/**
 * 会员统计 VO
 */
export interface MembershipStatsVO {
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
  expiringThisMonthCount: number;
}

/**
 * 查询会员列表
 */
export async function queryMemberships() {
  return await requestClient.get<MembershipVO[]>('/membership/list');
}

/**
 * 获取会员统计
 */
export async function getMembershipStats() {
  return await requestClient.get<MembershipStatsVO>('/membership/stats');
}

/**
 * 新增会员
 */
export async function createMembership(data: MembershipReq) {
  return await requestClient.post<MembershipVO>('/membership', data);
}

/**
 * 修改会员
 */
export async function updateMembership(data: MembershipReq) {
  return await requestClient.put<MembershipVO>('/membership', data);
}

/**
 * 删除会员
 */
export async function deleteMembership(id: string) {
  return await requestClient.delete<void>(`/membership/${id}`);
}
