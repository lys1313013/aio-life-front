import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestClient } from '../request';
import { createMilestone, updateMilestone } from './milestone';

vi.mock('../request', () => ({
  requestClient: { post: vi.fn(), put: vi.fn() },
}));

describe('里程碑日期契约', () => {
  beforeEach(() => vi.clearAllMocks());

  it('新增提交纯日期与 endDate，白名单移除旧字段', async () => {
    const payload = {
      title: '模拟里程碑',
      date: '2024-02-29',
      endDate: '2024-03-01',
      end_date: '旧字段',
    };
    await createMilestone(payload);
    expect(requestClient.post).toHaveBeenCalledWith('/milestones', {
      title: '模拟里程碑',
      date: '2024-02-29',
      endDate: '2024-03-01',
    });
  });

  it('更新保留显式清空，省略时不补空值', async () => {
    const id = '9223372036854775807';
    await updateMilestone({ id, date: '2026-11-16', endDate: null });
    expect(requestClient.put).toHaveBeenLastCalledWith('/milestones', {
      id,
      date: '2026-11-16',
      endDate: null,
    });
    await updateMilestone({ id, date: '2026-11-17' });
    expect(requestClient.put).toHaveBeenLastCalledWith('/milestones', {
      id,
      date: '2026-11-17',
    });
  });
});
