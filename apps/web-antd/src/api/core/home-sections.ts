import { requestClient } from '#/api/request';

export interface RecentMemo {
  id: string;
  title: null | string;
  hiddenContent: boolean;
  updateTime: null | string;
}
export interface ContinuingVideo {
  coverFileId: null | string;
  coverState: null | string;
  id: string;
  title: null | string;
  currentEpisode: number;
  episodes: number;
  watchedDurationSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  resumeUrl: null | string;
  lastWatched: null | string;
}
export interface CurrentDevice {
  fileId: null | string;
  id: string;
  name: null | string;
  purchaseDate: null | string;
  purchasePrice: null | number;
  usageDays: null | number;
  dailyCost: null | number;
}
interface SectionData {
  refreshInterval: number;
}
export type FinancePeriod = 'all' | 'month' | 'year';
export type FinancialSectionKind = 'expense' | 'finance' | 'income';
export interface FinancialSection extends SectionData {
  period: FinancePeriod;
  label: string;
  startDate: null | string;
  endDate: null | string;
  month: null | string;
}
export interface HomeSections {
  memo: SectionData & { items: RecentMemo[] };
  finance: FinancialSection & {
    balance: number;
    expense: number;
    income: number;
  };
  income: FinancialSection & { amount: number };
  expense: FinancialSection & { amount: number };
  video: SectionData & { items: ContinuingVideo[] };
  device: SectionData & { items: CurrentDevice[] };
}

export type WereadStatsGranularity = 'month' | 'week' | 'year';
export interface WereadStatsBucket {
  key: string;
  label: string;
  seconds: number;
}
export interface WereadStatsSection extends SectionData {
  buckets: WereadStatsBucket[];
  connected: boolean;
  dailyAverageSeconds: number;
  elapsedDays: number;
  granularity: WereadStatsGranularity;
  periodEnd: string;
  periodStart: string;
  previousPeriodEnd: string;
  previousPeriodStart: string;
  previousTotalSeconds: number;
  totalSeconds: number;
}
export type HomeSectionKind = keyof HomeSections;
export function isFinancialSection(
  kind: HomeSectionKind,
): kind is FinancialSectionKind {
  return kind === 'finance' || kind === 'income' || kind === 'expense';
}
export function getWereadStats(granularity: WereadStatsGranularity) {
  return requestClient.get<WereadStatsSection>('/home/sections/weread-stats', {
    params: { granularity },
  });
}
export function getHomeSection<K extends HomeSectionKind>(
  kind: K,
  period?: FinancePeriod,
) {
  return requestClient.get<HomeSections[K]>(
    `/home/sections/${kind}`,
    isFinancialSection(kind)
      ? { params: { period: period ?? 'month' } }
      : undefined,
  );
}
