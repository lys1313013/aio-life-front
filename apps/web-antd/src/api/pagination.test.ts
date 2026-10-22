import { describe, expect, it, vi } from 'vitest';

import { fetchAllPages, MAX_PAGE_SIZE } from './pagination';

describe('完整列表逐页读取', () => {
  it('超过 200 条时逐页取全，保留大整数字符串 ID', async () => {
    const rows = Array.from({ length: 405 }, (_, i) => ({
      id: String(9_223_372_036_854_775_807n - BigInt(i)),
    }));
    const fetchPage = vi.fn(async ({ page, pageSize }) => ({
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
    }));
    expect(await fetchAllPages(fetchPage)).toEqual(rows);
    expect(fetchPage.mock.calls.map(([params]) => params)).toEqual([
      { page: 1, pageSize: MAX_PAGE_SIZE },
      { page: 2, pageSize: MAX_PAGE_SIZE },
      { page: 3, pageSize: MAX_PAGE_SIZE },
    ]);
  });

  it('无总数时按空页停止，恰好满页且已达总数时不多请求', async () => {
    const rows = Array.from({ length: MAX_PAGE_SIZE }, (_, i) => i);
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: rows, total: null })
      .mockResolvedValueOnce({ items: [], total: null });
    expect(await fetchAllPages(fetchPage)).toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    fetchPage
      .mockReset()
      .mockResolvedValue({ items: rows, total: rows.length });
    expect(await fetchAllPages(fetchPage)).toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('中途失败不把部分数据当成完整列表返回', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: Array.from({ length: MAX_PAGE_SIZE }),
        total: 300,
      })
      .mockRejectedValueOnce(new Error('network error'));
    await expect(fetchAllPages(fetchPage)).rejects.toThrow('network error');
  });
});
