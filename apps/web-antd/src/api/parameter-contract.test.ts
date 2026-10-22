import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listCoverTemplates } from './bank-card/covers';
import { adminBatchFeedback, queryAllFeedbacks } from './core/feedback';
import { getRecentCommitsApi } from './core/github';
import { getWereadRecent } from './core/weread';
import { getMessagePageApi } from './core/message';
import { deletePasswordVault } from './core/passwordVault';
import { getTaskList, updateTaskDetail } from './core/todo';
import { MovieApi } from './movie';
import { ReadRecordApi } from './readRecord';
import { requestClient } from './request';
import { deleteUserApi } from './system/user';

vi.mock('./request', () => ({
  requestClient: {
    delete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Web 请求参数契约', () => {
  beforeEach(() => vi.clearAllMocks());

  it('阅读、观影、待办、消息和卡面统一发送 page/pageSize', async () => {
    const params = { page: 2, pageSize: 20 };
    for (const [call, url] of [
      [ReadRecordApi.pageList, '/read-record/page'],
      [MovieApi.pageList, '/movie/page'],
      [getTaskList, '/tasks'],
      [getMessagePageApi, '/message/page'],
      [listCoverTemplates, '/system/bank-card-covers/page'],
    ] as const) {
      await call(params);
      expect(requestClient.get).toHaveBeenLastCalledWith(
        url,
        expect.objectContaining({ params }),
      );
    }
  });

  it('游标阅读和提交记录采用 pageSize，同时保留独立游标语义', async () => {
    await getWereadRecent('cursor-2');
    expect(requestClient.get).toHaveBeenLastCalledWith('/weread/recent', {
      params: { cursor: 'cursor-2', pageSize: 6 },
      timeout: 120_000,
    });
    await getRecentCommitsApi(20, 2);
    expect(requestClient.get).toHaveBeenLastCalledWith(
      '/github/recent-commits',
      {
        params: { page: 2, pageSize: 20 },
      },
    );
  });

  it('用户、密码和反馈批量/筛选的 ID 全程保留大整数字符串', async () => {
    const id = '9223372036854775807';
    await deleteUserApi(id);
    expect(requestClient.delete).toHaveBeenLastCalledWith(`/user-center/${id}`);
    await deletePasswordVault(id);
    expect(requestClient.delete).toHaveBeenLastCalledWith(`/password/${id}`);
    await queryAllFeedbacks({ userId: id, page: 1, pageSize: 20 });
    expect(requestClient.get).toHaveBeenLastCalledWith('/feedback/admin/list', {
      params: { userId: id, page: 1, pageSize: 20 },
    });
    await adminBatchFeedback([id], 'CLOSE');
    expect(requestClient.post).toHaveBeenLastCalledWith(
      '/feedback/admin/batch',
      {
        idList: [id],
        action: 'CLOSE',
      },
    );
  });

  it('待办明细发送规范时间，并保留显式清空语义', async () => {
    await updateTaskDetail({
      id: '9223372036854775807',
      startTime: '2026-10-22 10:30:00',
      endTime: null,
    });
    expect(requestClient.put).toHaveBeenLastCalledWith('/taskDetails', {
      id: '9223372036854775807',
      startTime: '2026-10-22 10:30:00',
      endTime: null,
    });
  });
});
