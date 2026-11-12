import { describe, expect, it } from 'vitest';

import { timeSelectionBounds } from './time-selection';

const record = {
  id: '9223372036854775807',
  date: '2026-10-04',
  startMinute: 600,
  endMinute: 659,
};
const existing = [
  record,
  { startMinute: 540, endMinute: 599 },
  { startMinute: 680, endMinute: 700 },
];

describe('时迹时间禁选范围', () => {
  it('排除自身，限制在同一空闲段内，不能跨过已占用区间', () => {
    expect(timeSelectionBounds(record, existing, 'startMinute')).toEqual({
      min: 600,
      max: 659,
    });
    expect(timeSelectionBounds(record, existing, 'endMinute')).toEqual({
      min: 600,
      max: 679,
    });
  });
  it('不受其他日期影响，允许一分钟，不能跨天', () => {
    expect(
      timeSelectionBounds(
        { ...record, startMinute: 1439, endMinute: 1439 },
        [{ date: '2026-10-03', startMinute: 0, endMinute: 1439 }],
        'endMinute',
      ),
    ).toEqual({ min: 1439, max: 1439 });
    expect(
      timeSelectionBounds(
        { ...record, startMinute: 0, endMinute: 0 },
        [],
        'startMinute',
      ),
    ).toEqual({ min: 0, max: 0 });
  });
  it('另一端落在占用区间时没有合法选项', () => {
    const bounds = timeSelectionBounds(
      record,
      [{ startMinute: 650, endMinute: 700 }],
      'startMinute',
    );
    expect(bounds.min).toBeGreaterThan(bounds.max);
  });
});
