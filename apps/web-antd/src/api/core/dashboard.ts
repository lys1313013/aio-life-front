import { requestClient } from '#/api/request';

export interface DashboardCard {
  icon: string;
  iconClickUrl?: string;
  title: string;
  titleClickUrl?: string;
  value: string;
  valueColor?: string;
  totalTitle?: string;
  totalValue?: string;
}

export interface DashboardTaskItem {
  type: string;
  title: string;
  totalTitle: string;
  icon: string;
}

/**
 * Get list of dashboard tasks (card types)
 */
export async function getDashboardTasks() {
  return await requestClient.get<DashboardTaskItem[]>('/dashboard/tasks');
}

/**
 * Get details for a specific dashboard card type
 */
export async function getDashboardCardDetail(type: string) {
  return await requestClient.get<DashboardCard>(`/dashboard/card/${type}`);
}
