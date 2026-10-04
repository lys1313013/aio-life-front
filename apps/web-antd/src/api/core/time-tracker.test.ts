import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuery } from '#/api/query';

import { query, queryByDateRange } from './time-tracker';

vi.mock('#/api/query', () => ({ getQuery: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: {} }));

describe('时迹完整日列表契约', () => {
  beforeEach(() => vi.clearAllMocks());

  it('超过旧分页上限也完整接收，保留字符串 ID', async () => {
    const rows = Array.from({ length: 151 }, (_, i) => ({
      id: String(9_223_372_036_854_775_807n - BigInt(i)),
      startTime: i,
    }));
    vi.mocked(getQuery).mockResolvedValue(rows);
    expect(await query({ condition: { date: '2026-10-04' } })).toEqual(rows);
    expect(getQuery).toHaveBeenCalledExactlyOnceWith('/timeRecord/query', {
      condition: { date: '2026-10-04' },
    });
  });

  it('空列表和失败原样传递，周月查询继续走范围接口', async () => {
    vi.mocked(getQuery).mockResolvedValueOnce([]);
    expect(await query({ condition: { date: '2026-10-04' } })).toEqual([]);
    vi.mocked(getQuery).mockRejectedValueOnce(new Error('unavailable'));
    await expect(query({ condition: { date: '2026-10-04' } })).rejects.toThrow(
      'unavailable',
    );
    const range = {
      condition: { startDate: '2026-10-01', endDate: '2026-10-31' },
    };
    vi.mocked(getQuery).mockResolvedValueOnce([]);
    await queryByDateRange(range);
    expect(getQuery).toHaveBeenLastCalledWith(
      '/timeRecord/queryByDateRange',
      range,
    );
  });
});
