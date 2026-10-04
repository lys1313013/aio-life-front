import { describe, expect, it } from 'vitest';

import {
  minimalRequestPayload,
  pickPayload,
  pickPayloadList,
  pickQuery,
} from './payload';

describe('最小请求契约', () => {
  it('会员平台关联保留字符串 ID 和解除语义，去除只读平台信息', () => {
    const id = '9007199254740993';
    for (const providerId of [id, null]) {
      expect(
        pickPayload('MembershipReq', {
          id,
          providerId,
          providerName: '腾讯视频',
          providerIconKey: 'tencent_video',
          providerIdProvided: true,
        }),
      ).toEqual({ id, providerId });
    }
    expect(pickPayload('MembershipReq', { id, providerId: undefined })).toEqual(
      { id },
    );
    expect(
      minimalRequestPayload(`/system/membership-providers/${id}`, 'PUT', {
        name: '腾讯视频',
        code: 'tencent_video',
        category: 'video',
        iconKey: null,
        sortOrder: 0,
        isEnabled: 0,
        id,
        createUser: '1',
      }),
    ).toEqual({
      name: '腾讯视频',
      code: 'tencent_video',
      category: 'video',
      iconKey: null,
      sortOrder: 0,
      isEnabled: 0,
    });
  });

  it('卡片移动保留长 ID 和前后位置，移除归属与卡号', () => {
    for (const path of [
      '/bank-cards/order',
      '/system/bank-card-covers/order',
    ]) {
      expect(
        minimalRequestPayload(path, 'PUT', {
          id: '9007199254740993',
          targetId: '9007199254740994',
          after: false,
          userId: '1',
          cardNo: 'secret',
        }),
      ).toEqual({
        id: '9007199254740993',
        targetId: '9007199254740994',
        after: false,
      });
    }
  });

  it('首页固定保留取消值与长 ID，排序不允许回传归属或派生字段', () => {
    const ids = ['9007199254740993', '9223372036854775806'];
    for (const path of ['/goals', '/anniversaryRecords']) {
      expect(
        minimalRequestPayload(`${path}/${ids[0]}/pin`, 'PUT', {
          isPinned: 0,
          pinnedSort: -99,
          userId: 'other',
        }),
      ).toEqual({ isPinned: 0 });
      expect(
        minimalRequestPayload(`${path}/pinned-order`, 'PUT', {
          ids,
          userId: 'other',
          isDeleted: 1,
        }),
      ).toEqual({ ids });
      expect(pickQuery(path, { isPinned: 1, userId: 'other' })).toEqual({
        isPinned: 1,
      });
      expect(
        minimalRequestPayload(path, 'PUT', {
          id: ids[0],
          isPinned: 0,
          pinnedSort: -99,
          userId: 'other',
        }),
      ).toEqual({ id: ids[0], isPinned: 0 });
    }
  });

  it('首页阅读和观影保留服务端状态排序条件', () => {
    for (const path of ['/read-record/page', '/movie/page']) {
      const query = {
        current: 2,
        size: 20,
        activeOnly: true,
        inProgressFirst: true,
      };
      expect(pickQuery(path, { ...query, userId: 'other' })).toEqual(query);
    }
  });

  it('创建移除 ID 与审计字段，更新由 URL 指定 ID', () => {
    const record = {
      id: '9007199254740993',
      content: '任务',
      userId: '22',
      isDeleted: 1,
      unCompletedCount: 9,
    };
    expect(pickPayload('TaskCreateReq', record)).toEqual({ content: '任务' });
    expect(
      minimalRequestPayload('/tasks/9007199254740993', 'PUT', record),
    ).toEqual({ content: '任务' });
    expect(record.id).toBe('9007199254740993');
  });

  it('排序只带定位与顺序，不回传整个任务', () => {
    expect(
      pickPayloadList('TaskSortReq', [
        {
          id: '9007199254740993',
          columnId: '2',
          sortOrder: 0,
          content: '任务',
          userId: '11',
        },
      ]),
    ).toEqual([{ id: '9007199254740993', columnId: '2', sortOrder: 0 }]);
  });

  it('嵌套记录剔除归属和派生值', () => {
    expect(
      pickPayload('TimeRecordSaveReq', {
        date: '2026-10-01',
        duration: 60,
        exercises: [
          {
            id: '3',
            exerciseTypeId: '4',
            exerciseCount: 0,
            userId: '11',
            exerciseName: '运动',
          },
        ],
      }),
    ).toEqual({
      date: '2026-10-01',
      exercises: [{ exerciseTypeId: '4', exerciseCount: 0 }],
    });
    expect(
      pickPayload('ThoughtUpdateReq', {
        events: [
          {
            id: '9007199254740993',
            content: '事件',
            thoughtId: '1',
            createTime: 'readonly',
          },
        ],
      }),
    ).toEqual({ events: [{ id: '9007199254740993', content: '事件' }] });
  });

  it('附件与父级保留 null、空列表和未传字段的区别', () => {
    expect(
      pickPayload('HonorRecordUpdateReq', {
        id: '1',
        fileIds: null,
        files: [{ id: '2' }],
      }),
    ).toEqual({ id: '1', fileIds: null });
    expect(
      pickPayload('HonorRecordUpdateReq', { id: '1', fileIds: [] }),
    ).toEqual({ id: '1', fileIds: [] });
    expect(
      pickPayload('TimeTrackerCategoryUpdateReq', { id: '1', parentId: null }),
    ).toEqual({ id: '1', parentId: null });
    expect(
      pickPayload('TimeTrackerCategoryUpdateReq', {
        id: '1',
        parentId: undefined,
      }),
    ).toEqual({ id: '1' });
  });

  it('银行卡附件、标签和小数保留原值', () => {
    expect(
      pickPayload('BankCardReq', {
        id: '1',
        cardName: '储蓄卡',
        creditLimit: '100.50',
        coverFileIds: [],
        tagIds: ['9007199254740993'],
        coverUrl: 'readonly',
        userId: '11',
      }),
    ).toEqual({
      cardName: '储蓄卡',
      creditLimit: '100.50',
      coverFileIds: [],
      tagIds: ['9007199254740993'],
    });
  });

  it('精确路径优先，分页筛选保留 false 与零', () => {
    expect(
      pickQuery('/relationships/persons/search', {
        keyword: '人',
        userId: '11',
      }),
    ).toEqual({ keyword: '人' });
    expect(
      pickQuery('/movie/page', {
        current: 0,
        size: 20,
        activeOnly: false,
        userId: '11',
      }),
    ).toEqual({ current: 0, size: 20, activeOnly: false });
  });

  it('删除关系和动态 MCP 参数有各自的契约', () => {
    expect(
      minimalRequestPayload('/relationships', 'DELETE', {
        sourcePersonId: '1',
        targetPersonId: '2',
        description: 'readonly',
      }),
    ).toEqual({ sourcePersonId: '1', targetPersonId: '2' });
    const tool = {
      name: 'business_tool',
      arguments: { userDefined: { value: 0 } },
      ignored: 1,
    };
    expect(pickPayload('ToolCallRequest', tool)).toEqual({
      name: tool.name,
      arguments: tool.arguments,
    });
  });
});
