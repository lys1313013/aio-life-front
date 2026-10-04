import { describe, expect, it } from 'vitest';

import { timeSelectionBounds } from './time-selection';

const record = {
  id: '9223372036854775807',
  date: '2026-10-04',
  startTime: 600,
  endTime: 659,
};
const existing = [
  record,
  { startTime: 540, endTime: 599 },
  { startTime: 680, endTime: 700 },
];

describe('时迹时间禁选范围', () => {
  it('排除自身，限制在同一空闲段内，不能跨过已占用区间', () => {
    expect(timeSelectionBounds(record, existing, 'startTime')).toEqual({
      min: 600,
      max: 659,
    });
    expect(timeSelectionBounds(record, existing, 'endTime')).toEqual({
      min: 600,
      max: 679,
    });
  });
  it('不受其他日期影响，允许一分钟，不能跨天', () => {
    expect(
      timeSelectionBounds(
        { ...record, startTime: 1439, endTime: 1439 },
        [{ date: '2026-10-03', startTime: 0, endTime: 1439 }],
        'endTime',
      ),
    ).toEqual({ min: 1439, max: 1439 });
    expect(
      timeSelectionBounds(
        { ...record, startTime: 0, endTime: 0 },
        [],
        'startTime',
      ),
    ).toEqual({ min: 0, max: 0 });
  });
  it('另一端落在占用区间时没有合法选项', () => {
    const bounds = timeSelectionBounds(
      record,
      [{ startTime: 650, endTime: 700 }],
      'startTime',
    );
    expect(bounds.min).toBeGreaterThan(bounds.max);
  });
});
