import type { HomeSections } from './home-sections';

import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

export type FinanceRecordKind = 'expense' | 'income';
export type FinanceKind = 'finance' | FinanceRecordKind;
export type FinanceMetric = 'balance' | FinanceRecordKind;
export interface FinanceTotals {
  income?: number;
  expense?: number;
  balance?: number;
}

export type FinanceGranularity = 'day' | 'month' | 'week' | 'year';
export interface FinanceCalendarQuery {
  granularity: FinanceGranularity;
  date?: string;
}
export interface FinanceCalendarBucket extends FinanceTotals {
  key: string;
  label: string;
  startDate: null | string;
  endDate: null | string;
  amount: number;
  future: boolean;
}
export type FinanceCalendar = FinanceTotals &
  HomeSections['expense'] & {
    buckets: FinanceCalendarBucket[];
    date: null | string;
    granularity: FinanceGranularity;
    today: string;
  };
export async function getFinanceCalendar(
  kind: FinanceKind,
  params: FinanceCalendarQuery,
) {
  return await requestClient.get<FinanceCalendar>(
    `/home/sections/${kind}/calendar`,
    {
      params,
    },
  );
}

export interface FinanceCalendarDetail {
  id: string;
  bookkeepingAmount?: null | number;
  transactionAmount?: null | number;
  grossAmount?: null | number;
  taxAmount?: null | number;
  incomeDate?: null | string;
  incomeTypeId?: null | string;
  expenseTime?: null | string;
  expenseDesc?: null | string;
  counterparty?: null | string;
  remark?: null | string;
  expenseTypeId?: null | string;
  payTypeId?: null | string;
  transactionId?: null | string;
  transactionStatus?: null | string;
  merchantOrderNo?: null | string;
}

export async function getFinanceCalendarDetails(
  kind: FinanceRecordKind,
  bucket: FinanceCalendarBucket,
  page: number,
  pageSize = 20,
) {
  if (!bucket.startDate || !bucket.endDate) {
    throw new Error('财务日历范围缺少日期');
  }
  const condition = {
    startTime:
      kind === 'income'
        ? bucket.startDate
        : `${bucket.startDate} 00:00:00`,
    endTimeBefore:
      kind === 'income' ? bucket.endDate : `${bucket.endDate} 00:00:00`,
  };
  return await getQuery<{
    items: FinanceCalendarDetail[];
    total: null | number;
  }>(`/${kind}/query`, {
    page,
    pageSize,
    condition,
  });
}
