import { requestClient } from '#/api/request';

export interface WatchedTaskDetail {
  id: number;
  taskId: number;
  taskName: string;
  content: string;
  priority: number;
  isCompleted: number; // 0: uncompleted, 1: completed
  isStarred?: number; // 0: not starred, 1: starred
  startTime?: string;
  endTime?: string;
}

export interface DashboardCard {
  icon: string;
  iconClickUrl?: string;
  title: string;
  titleClickUrl?: string;
  value: string;
  valueColor?: string;
  totalTitle?: string;
  totalValue?: string;
  refreshInterval?: number;
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

/**
 * Get watched task details
 */
export async function getWatchedTaskDetails() {
  return await requestClient.get<WatchedTaskDetail[]>('/taskDetails/watched');
}
