import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('#/api/request', () => ({ requestClient: http }));
import {
  getGoalList,
  goalDisplayStatus,
  goalProgressPercent,
  refreshGoalRows,
} from './goal';

const base = {
  title: '模拟目标',
  type: 6,
  status: 'in_progress' as const,
  progress: 0,
  progressMode: 'graphql' as const,
  progressCheckedAt: '2026-11-03 10:00:00',
};
beforeEach(() => vi.clearAllMocks());
describe('目标查询进度', () => {
  it('三类数值与严格超过边界一致，失败保留成功状态', () => {
    expect(
      goalProgressPercent({ ...base, currentValue: 26, targetValue: 40 }),
    ).toBe(65);
    expect(
      goalProgressPercent({
        ...base,
        currentValue: 25,
        targetValue: 100,
        targetOperator: 'gt',
      }),
    ).toBe(25);
    expect(
      goalProgressPercent({
        ...base,
        currentValue: 100,
        targetValue: 100,
        targetOperator: 'gt',
      }),
    ).toBe(99);
    expect(
      goalDisplayStatus({
        ...base,
        currentValue: 100,
        targetValue: 100,
        targetOperator: 'gt',
      }),
    ).toBe('in_progress');
    expect(
      goalDisplayStatus({
        ...base,
        currentValue: 101,
        targetValue: 100,
        targetOperator: 'gt',
      }),
    ).toBe('completed');
    expect(
      goalDisplayStatus({
        ...base,
        currentValue: 15000.25,
        targetValue: 15000,
        progressError: '超时',
      }),
    ).toBe('completed');
  });
  it('刷新后按实际达标徽标筛选，并保留字符串ID', async () => {
    const row = {
      ...base,
      id: '9223372036854775807',
      currentValue: 0,
      targetValue: 50,
    };
    http.get.mockResolvedValue([row]);
    http.post.mockResolvedValue([{ ...row, currentValue: 50 }]);
    const rows = await getGoalList({ status: 'completed', type: 6 });
    expect(http.get).toHaveBeenCalledWith('/goals', { params: { type: 6 } });
    expect(http.post).toHaveBeenCalledWith('/goals/progress/refresh', {
      ids: [row.id],
    });
    expect(rows).toHaveLength(1);
  });
  it('手动值不查询，每批最多十条，失败保留最近值', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({
      ...base,
      id: String(i + 1),
      currentValue: 25,
      targetValue: 100,
    }));
    http.post.mockRejectedValue(new Error('断网'));
    const result = await refreshGoalRows(rows);
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(http.post.mock.calls[0]?.[1].ids).toHaveLength(10);
    expect(result[0]?.currentValue).toBe(25);
    expect(result[0]?.progressError).toContain('失败');
    http.post.mockClear();
    await refreshGoalRows([{ ...base, progressMode: 'manual' }]);
    expect(http.post).not.toHaveBeenCalled();
  });
});
