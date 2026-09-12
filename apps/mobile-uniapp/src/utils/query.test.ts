import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuery } from './query';
import { get } from './request';

vi.mock('./request', () => ({ get: vi.fn() }));

describe('移动端 GET 查询', () => {
  beforeEach(() => vi.clearAllMocks());

  it('编码中文和特殊字符并通过 URL 传递数组、日期和分页', async () => {
    const data = {
      page: 2,
      condition: {
        statuses: ['in_progress', 'on_hold'],
        remark: '午餐 & 饮料+甜点',
        startTime: '2026-09-01 08:30:00',
        id: '9007199254740993',
        activeOnly: false,
        count: 0,
        unused: null,
      },
    };
    const original = structuredClone(data);
    await getQuery('/movie/page', data);
    const url = new URL(
      vi.mocked(get).mock.calls[0]![0],
      'https://example.com',
    );
    expect(url.searchParams.getAll('statuses')).toEqual([
      'in_progress',
      'on_hold',
    ]);
    expect(url.searchParams.get('remark')).toBe(data.condition.remark);
    expect(url.searchParams.get('startTime')).toBe(data.condition.startTime);
    expect(url.searchParams.get('id')).toBe('9007199254740993');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('activeOnly')).toBe('false');
    expect(url.searchParams.get('count')).toBe('0');
    expect(url.searchParams.has('unused')).toBe(false);
    expect(vi.mocked(get).mock.calls[0]).toHaveLength(1);
    expect(data).toEqual(original);
  });

  it('支持空筛选及已有查询字符串', async () => {
    await getQuery('/income/statisticsByYear');
    expect(get).toHaveBeenLastCalledWith('/income/statisticsByYear');
    await getQuery('/movie/page?current=1', { statuses: ['in_progress'] });
    expect(get).toHaveBeenLastCalledWith(
      '/movie/page?current=1&statuses=in_progress',
    );
  });
});
