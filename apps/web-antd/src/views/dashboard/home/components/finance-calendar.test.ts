import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  financeCalendarPlaceholder,
  financeGranularityKey,
  financeToday,
  formatFinanceAmount,
  readFinanceGranularity,
  saveFinanceGranularity,
} from './finance-calendar';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    clear: () => values.clear(),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('大额日格缩写但合计与明细保持完整精度', () => {
  expect(formatFinanceAmount(999_999_999.99, true)).toBe('10亿');
  expect(formatFinanceAmount(999_999_999.99)).toBe('999,999,999.99');
  expect(formatFinanceAmount(128.8, true)).toBe('128.8');
  expect(formatFinanceAmount(1234.56, true)).toBe('1234.56');
  expect(formatFinanceAmount(132.89, true)).toBe('132.89');
  expect(formatFinanceAmount(1000, true)).toBe('1000');
  expect(formatFinanceAmount(9999.99, true)).toBe('9999.99');
  expect(formatFinanceAmount(-9999.99, true)).toBe('-9999.99');
  expect(formatFinanceAmount(1234.56)).toBe('1,234.56');
});

it('保存粒度后重新读取且账号隔离，未知旧值退回日视图', () => {
  saveFinanceGranularity('9007199254740993', 'week', 'expense');
  expect(readFinanceGranularity('9007199254740993', 'expense')).toBe('week');
  expect(readFinanceGranularity('9007199254740994', 'expense')).toBe('day');
  window.localStorage.setItem(
    financeGranularityKey('9007199254740993', 'expense'),
    'all',
  );
  expect(readFinanceGranularity('9007199254740993', 'expense')).toBe('day');
});

it('浏览器禁止本地存储不阻断页面', () => {
  vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(readFinanceGranularity('user', 'expense')).toBe('day');
  expect(() =>
    saveFinanceGranularity('user', 'month', 'expense'),
  ).not.toThrow();
});

it('日历骨架覆盖闰年、六行月份和截断的月首月尾周', () => {
  expect(
    financeCalendarPlaceholder({ granularity: 'day', date: '2024-02' }).buckets,
  ).toHaveLength(29);
  const weeks = financeCalendarPlaceholder({
    granularity: 'week',
    date: '2026-03',
  }).buckets;
  expect(weeks).toHaveLength(6);
  expect(weeks[0]).toMatchObject({
    startDate: '2026-03-01',
    endDate: '2026-03-02',
  });
  expect(weeks.at(-1)).toMatchObject({
    startDate: '2026-03-30',
    endDate: '2026-04-01',
  });
  expect(
    financeCalendarPlaceholder({ granularity: 'month', date: '2026' }).buckets,
  ).toHaveLength(12);
});

it('采用北京时间切日而不是运行环境时区', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T16:01:00Z'));
  expect(financeToday()).toBe('2026-11-01');
  expect(
    financeCalendarPlaceholder({ granularity: 'day', date: '2026-11' })
      .buckets[0]?.future,
  ).toBe(false);
});

it('收入仅周月年，存储与支出隔离且旧日粒度回退到周', () => {
  saveFinanceGranularity('user', 'year', 'expense');
  expect(readFinanceGranularity('user', 'income')).toBe('week');
  saveFinanceGranularity('user', 'month', 'income');
  expect(readFinanceGranularity('user', 'expense')).toBe('year');
  expect(readFinanceGranularity('user', 'income')).toBe('month');
  window.localStorage.setItem(financeGranularityKey('user', 'income'), 'day');
  expect(readFinanceGranularity('user', 'income')).toBe('week');
});

it('概览独立保存周月年粒度，不覆盖收入和支出', () => {
  expect(readFinanceGranularity('user', 'finance')).toBe('week');
  saveFinanceGranularity('user', 'year', 'finance');
  expect(readFinanceGranularity('user', 'finance')).toBe('year');
  expect(readFinanceGranularity('user', 'income')).toBe('week');
  expect(readFinanceGranularity('user', 'expense')).toBe('day');
});
