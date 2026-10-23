import type {
  FinanceCalendar,
  FinanceCalendarQuery,
  FinanceGranularity,
  FinanceKind,
} from '#/api/core/finance-calendar';

import dayjs from 'dayjs';

const granularities: {
  label: string;
  value: FinanceGranularity;
}[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
  { label: '年', value: 'year' },
];

export function financeGranularities(kind: FinanceKind) {
  return granularities.filter(
    (item) => kind === 'expense' || item.value !== 'day',
  );
}

export function financeToday() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 日格万元以下显示完整数字且省略千分位；合计、明细和无障碍名称保留完整金额。 */
export function formatFinanceAmount(value: number, compact = false) {
  if (compact && Math.abs(value) >= 10_000) {
    return value.toLocaleString('zh-CN', {
      notation: 'compact',
      maximumSignificantDigits: 3,
    });
  }
  return value.toLocaleString('zh-CN', {
    useGrouping: !compact,
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function financeGranularityKey(identity: string, kind: FinanceKind) {
  return `aio-life:home:${kind}:granularity:${identity}`;
}

export function readFinanceGranularity(
  identity: string,
  kind: FinanceKind,
): FinanceGranularity {
  try {
    const value = window.localStorage.getItem(
      financeGranularityKey(identity, kind),
    );
    return (
      financeGranularities(kind).find((item) => item.value === value)?.value ??
      (kind === 'expense' ? 'day' : 'week')
    );
  } catch {
    return kind === 'expense' ? 'day' : 'week';
  }
}

export function saveFinanceGranularity(
  identity: string,
  value: FinanceGranularity,
  kind: FinanceKind,
) {
  try {
    window.localStorage.setItem(financeGranularityKey(identity, kind), value);
  } catch {
    // 浏览器禁用存储时仍允许当前页面切换。
  }
}

/** 首屏按真实日历行数占位，错误重试沿用同一结构。 */
export function financeCalendarPlaceholder(
  query: FinanceCalendarQuery,
): FinanceCalendar {
  const today = financeToday();
  const mode = query.granularity;
  const start = dayjs(query.date || today).startOf(
    mode === 'month' || mode === 'year' ? 'year' : 'month',
  );
  const end = start.add(
    1,
    mode === 'month' || mode === 'year' ? 'year' : 'month',
  );
  const buckets: FinanceCalendar['buckets'] = [];
  for (let cursor = start; cursor.isBefore(end); ) {
    let next =
      mode === 'month'
        ? cursor.add(1, 'month')
        : mode === 'year'
          ? end
          : mode === 'week'
            ? cursor.add(7 - ((cursor.day() + 6) % 7), 'day')
            : cursor.add(1, 'day');
    if (next.isAfter(end)) next = end;
    buckets.push({
      key: cursor.format('YYYY-MM-DD'),
      label:
        mode === 'day'
          ? cursor.format('D')
          : mode === 'week'
            ? `第${buckets.length + 1}周`
            : mode === 'month'
              ? cursor.format('M月')
              : cursor.format('YYYY年'),
      startDate: cursor.format('YYYY-MM-DD'),
      endDate: next.format('YYYY-MM-DD'),
      amount: 0,
      future: cursor.format('YYYY-MM-DD') > today,
    });
    cursor = next;
  }
  return {
    granularity: mode,
    date: query.date ?? null,
    period: mode === 'year' ? 'all' : mode === 'month' ? 'year' : 'month',
    label:
      mode === 'year'
        ? '全部'
        : start.format(mode === 'month' ? 'YYYY年' : 'YYYY年M月'),
    startDate: mode === 'year' ? null : start.format('YYYY-MM-DD'),
    endDate: mode === 'year' ? null : end.format('YYYY-MM-DD'),
    month: mode === 'day' || mode === 'week' ? start.format('YYYY-MM') : null,
    today,
    amount: 0,
    buckets,
    refreshInterval: 300,
  };
}
