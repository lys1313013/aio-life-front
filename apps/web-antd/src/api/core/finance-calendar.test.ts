import { beforeEach, expect, it, vi } from 'vitest';

import { getFinanceCalendarDetails } from './finance-calendar';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: { get: mocks.get } }));
beforeEach(() => mocks.get.mockReset());
it('日周月年使用完整半开区间和规范分页参数，保留结束边界', async () => {
  for (const [startDate, endDate] of [
    ['2026-08-12', '2026-08-13'],
    ['2026-08-10', '2026-08-17'],
    ['2026-08-01', '2026-09-01'],
    ['2026-01-01', '2027-01-01'],
  ]) {
    await getFinanceCalendarDetails(
      'expense',
      {
        key: 'range',
        label: '',
        startDate: startDate!,
        endDate: endDate!,
        amount: 0,
        future: false,
      },
      2,
    );
    expect(mocks.get).toHaveBeenLastCalledWith('/expense/query', {
      params: {
        page: 2,
        pageSize: 20,
        startTime: `${startDate} 00:00:00`,
        endTimeBefore: `${endDate} 00:00:00`,
      },
      paramsSerializer: 'repeat',
    });
  }
});
it.each(['income', 'expense'] as const)(
  '%s 未填日期格子仅查询未填日期记录',
  async (kind) => {
    await getFinanceCalendarDetails(
      kind,
      {
        key: 'undated',
        label: '未填日期',
        startDate: null,
        endDate: null,
        amount: 0,
        future: false,
      },
      1,
    );
    expect(mocks.get).toHaveBeenCalledWith(`/${kind}/query`, {
      params: { page: 1, pageSize: 20, undated: true },
      paramsSerializer: 'repeat',
    });
  },
);

it('收入使用纯日期半开区间和收入接口', async () => {
  await getFinanceCalendarDetails(
    'income',
    {
      key: 'week',
      label: '第一周',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      amount: 0,
      future: false,
    },
    1,
  );
  expect(mocks.get).toHaveBeenCalledWith('/income/query', {
    params: {
      page: 1,
      pageSize: 20,
      startTime: '2026-08-01',
      endTimeBefore: '2026-08-03',
    },
    paramsSerializer: 'repeat',
  });
});
