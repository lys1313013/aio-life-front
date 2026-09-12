import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuery } from './query';
import { requestClient } from './request';

vi.mock('./request', () => ({ requestClient: { get: vi.fn() } }));

describe('gET 查询参数', () => {
  beforeEach(() => vi.clearAllMocks());

  it('平铺分页条件，保留日期、ID、false 和零，不修改原参数', async () => {
    const data = {
      page: 2,
      pageSize: 20,
      condition: {
        id: '9007199254740993',
        startTime: '2026-09-01 08:30:00',
        activeOnly: false,
        count: 0,
        unused: null,
      },
    };
    const original = structuredClone(data);
    const result = { items: [], total: 0 };
    vi.mocked(requestClient.get).mockResolvedValue(result);
    expect(await getQuery('/expense/query', data)).toBe(result);
    expect(requestClient.get).toHaveBeenCalledWith('/expense/query', {
      params: {
        page: 2,
        pageSize: 20,
        id: '9007199254740993',
        startTime: '2026-09-01 08:30:00',
        activeOnly: false,
        count: 0,
      },
      paramsSerializer: 'repeat',
    });
    expect(data).toEqual(original);
  });

  it('枚举数组使用重复参数，无筛选时不发送请求体', async () => {
    await getQuery('/movie/page', { statuses: ['in_progress', 'on_hold'] });
    expect(requestClient.get).toHaveBeenLastCalledWith('/movie/page', {
      params: { statuses: ['in_progress', 'on_hold'] },
      paramsSerializer: 'repeat',
    });
    await getQuery('/income/statisticsByYear');
    expect(requestClient.get).toHaveBeenLastCalledWith(
      '/income/statisticsByYear',
      {
        params: {},
        paramsSerializer: 'repeat',
      },
    );
  });
});
