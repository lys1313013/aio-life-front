import type { Footprint } from '#/api/core/life-footprints';

import { describe, expect, it } from 'vitest';

import { emptyDraft, PRESENT_DATE } from './model';
import { batchPayload, groupPeriods, mergeBatchResult } from './periods';

const record = (
  id: string,
  startDate = '2021-07-25',
  endDate = PRESENT_DATE,
): Footprint => ({
  ...emptyDraft(),
  id,
  startDate,
  endDate,
  placeName: '住所',
  longitude: 116.3,
  latitude: 40.07,
  coordinateSystem: 'GCJ02',
  remark: '居住',
});

describe('生活足迹时间段批量编辑', () => {
  it('起止完全相同才分组，重叠日期与不同至今开始日不合并', () => {
    const groups = groupPeriods([
      record('9223372036854775807'),
      record('9223372036854775806'),
      record('3', '2021-07-25', '2025-01-01'),
      record('4', '2022-01-01'),
    ]);
    expect(groups).toHaveLength(3);
    expect(
      groups
        .find((g) => g.endDate === PRESENT_DATE && g.startDate === '2021-07-25')
        ?.records.map((r) => r.id),
    ).toEqual(['9223372036854775806', '9223372036854775807']);
    expect(groupPeriods([])).toEqual([]);
  });

  it('共享日期写入每条明细，未保存明细不提交临时ID和UI字段', () => {
    const value = { ...record('9223372036854775807'), confirmed: true };
    const request = batchPayload(
      { startDate: '2020-01-01', endDate: '2026-01-01' },
      [
        { key: value.id, value },
        { key: 'draft-1', value: { ...value, id: null, remark: '' } },
      ],
      ['9223372036854775806'],
    );
    expect(request.items.map((r) => r.startDate)).toEqual([
      '2020-01-01',
      '2020-01-01',
    ]);
    expect(request.items.map((r) => r.endDate)).toEqual([
      '2026-01-01',
      '2026-01-01',
    ]);
    expect(request.items[0]?.id).toBe('9223372036854775807');
    expect(request.items[1]).not.toHaveProperty('id');
    expect(request.items[1]).not.toHaveProperty('confirmed');
    expect(request.items[1]).not.toHaveProperty('key');
    expect(request.items[1]?.remark).toBeNull();
    expect(request.deletedIds).toEqual(['9223372036854775806']);
  });

  it('未确认定位不能保存，删除全部只提交明确的ID，无变更拒绝', () => {
    const period = { startDate: '2021-07-25', endDate: PRESENT_DATE };
    expect(() =>
      batchPayload(
        period,
        [{ key: 'a', value: { ...record('1'), confirmed: false } }],
        [],
      ),
    ).toThrow('确认');
    expect(batchPayload(period, [], ['1'])).toEqual({
      items: [],
      deletedIds: ['1'],
    });
    expect(() => batchPayload(period, [], [])).toThrow('至少');
  });

  it('局部合并保留其他记录，并在修改后日期相同时自动归组', () => {
    const other = record('2', '2022-01-01');
    const result = mergeBatchResult(
      [record('1'), other, record('3')],
      [record('1', '2022-01-01'), record('4', '2022-01-01')],
      ['3'],
    );
    expect(result.map((r) => r.id)).toEqual(['1', '2', '4']);
    expect(result.find((r) => r.id === '2')).toBe(other);
    expect(groupPeriods(result)).toHaveLength(1);
  });
});
