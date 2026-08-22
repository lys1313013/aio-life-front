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
  menuId?: string;
  icon: string;
  title: string;
  path: string;
  url?: string;
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

/**
 * 首页运动汇总 - 按天 × 运动类型聚合的子项
 */
export interface ExerciseDashboardItemVO {
  // 后端 Long 全局序列化为字符串
  exerciseTypeId?: string;
  /** 运动类型名称 */
  typeLabel?: string;
  /** 图标（Iconify 格式） */
  icon?: string;
  /** 主题色（Hex） */
  color?: string;
  /** 当日该类型运动总次数 */
  count?: number;
  /** 上一次做该类型运动的日期；首次记录时后端不返回（NON_NULL） */
  prevDate?: string;
  /** 上一次的次数；首次记录时后端不返回 */
  prevCount?: number;
  /** 差值（本次 - 上次）；首次记录时后端不返回 */
  deltaCount?: number;
  /** 差值百分比；首次记录或上次为 0 时后端不返回 */
  deltaPercent?: number;
}

/**
 * 首页运动汇总 - 按天聚合的一行记录
 */
export interface ExerciseDashboardDayVO {
  /** 运动日期（yyyy-MM-dd） */
  date?: string;
  /** 当日所有运动的总次数 */
  totalCount?: number;
  /** 当日按运动类型聚合后的子项列表 */
  items?: ExerciseDashboardItemVO[];
}

/**
 * 首页运动汇总 - 游标分页结果（基于 lastDate 向前翻页）
 */
export interface ExerciseDashboardSummaryVO {
  /** 下一页请求使用的 lastDate（当前结果中最早一天的前一天）；为空表示已是最后一页 */
  lastDate?: string;
  /** 是否还有更多历史数据 */
  hasMore?: boolean;
  /** 按日期降序排列的汇总列表 */
  days?: ExerciseDashboardDayVO[];
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
 * 获取时迹
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
 * 获取运动概览（按天 × 运动类型聚合，游标分页；limit 默认 7、最大 30）
 */
export async function getDashboardSummaryApi(params?: {
  lastDate?: string;
  limit?: number;
}) {
  return await get<ExerciseDashboardSummaryVO>(
    "/exerciseRecord/dashboardSummary",
    params,
  );
}
