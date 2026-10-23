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
  amt: null | number;
  transactionAmt?: null | number;
  incDate?: null | string;
  incTypeId?: null | string;
  tax?: null | number;
  expTime?: null | string;
  expDesc?: null | string;
  counterparty?: null | string;
  remark?: null | string;
  expTypeId?: null | string;
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
  const condition =
    bucket.startDate && bucket.endDate
      ? {
          startTime:
            kind === 'income'
              ? bucket.startDate
              : `${bucket.startDate} 00:00:00`,
          endTimeBefore:
            kind === 'income' ? bucket.endDate : `${bucket.endDate} 00:00:00`,
        }
      : { undated: true };
  return await getQuery<{
    items: FinanceCalendarDetail[];
    total: null | number;
  }>(`/${kind}/query`, {
    page,
    pageSize,
    condition,
  });
}
