import { describe, expect, it } from 'vitest';

import {
  minimalRequestPayload,
  pickPayload,
  pickPayloadList,
  pickQuery,
} from './payload';

describe('最小请求契约', () => {
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
