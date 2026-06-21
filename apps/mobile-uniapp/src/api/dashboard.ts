import { get, post } from "../utils/request";

export interface WatchedTaskDetail {
  id: string;
  taskId: string;
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

export interface QuickNavItem {
  id?: string;
  icon: string;
  title: string;
  url: string;
  bgColor?: string;
  color?: string;
  sort?: number;
}

export interface ThoughtItem {
  id: string;
  content: string;
  createTime: string;
}

export interface GithubCommitVO {
  id?: string;
  repo?: string;
  repoUrl?: string;
  commitUrl?: string;
  message?: string;
  date?: string;
  avatar?: string;
  actor?: string;
}

export interface ExerciseDashboardSummaryVO {
  totalDuration: number;
  totalTimes: number;
  recentRecords: any[];
}

/**
 * 获取首页卡片任务列表
 */
export async function getDashboardTasks() {
  return await get<DashboardTaskItem[]>("/dashboard/tasks");
}

/**
 * 获取具体卡片的数据详情
 */
export async function getDashboardCardDetail(type: string) {
  return await get<DashboardCard>(`/dashboard/card/${type}`);
}

/**
 * 获取正在关注的任务详情
 */
export async function getWatchedTaskDetails() {
  return await get<WatchedTaskDetail[]>("/taskDetails/watched");
}

/**
 * 获取快捷导航
 */
export async function getMyQuickNavApi() {
  return await get<QuickNavItem[]>("/quick-nav/my");
}

/**
 * 获取固定的闪念
 */
export async function getPinnedThoughts() {
  return await get<ThoughtItem[]>("/thought/dashboard");
}

/**
 * 获取今日时迹
 */
export async function queryTimeTracker(date: string) {
  return await post<any>("/timeRecord/query", { condition: { date } });
}

/**
 * 获取 GitHub 最近提交
 */
export async function getRecentCommitsApi(perPage = 5) {
  return await get<GithubCommitVO[]>("/github/recent-commits", { perPage });
}

/**
 * 获取运动概览
 */
export async function getDashboardSummaryApi() {
  return await get<ExerciseDashboardSummaryVO>("/exerciseRecord/dashboardSummary");
}
