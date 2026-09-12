import type { TimeSlot } from './types';

import { describe, expect, it } from 'vitest';

import {
  endTimeFromDuration,
  getSlotDuration,
  getSlotPosition,
  hasOverlap,
  hasOverlapExcluding,
  isValidSlot,
  moveSlot,
  resizeSlot,
} from './utils';

function slot(
  startTime: number,
  endTime: number,
  overrides: Partial<TimeSlot> = {},
): TimeSlot {
  return {
    id: 'current',
    date: '2026-09-12',
    categoryId: 'read',
    startTime,
    endTime,
    ...overrides,
  };
}

describe('时迹分钟闭区间', () => {
  it.each([
    [0, 0, 1],
    [540, 599, 60],
    [540, 600, 61],
    [1439, 1439, 1],
    [0, 1439, 1440],
  ])('%i 到 %i 包含 %i 分钟', (startTime, endTime, duration) => {
    expect(getSlotDuration(slot(startTime, endTime))).toBe(duration);
    expect(isValidSlot(slot(startTime, endTime))).toBe(true);
    expect(endTimeFromDuration(startTime, duration)).toBe(endTime);
  });

  it.each([
    [-1, 0],
    [0, 1440],
    [600, 599],
    [0.5, 1],
    [0, Number.NaN],
  ])('拒绝无效区间 %i 到 %i', (startTime, endTime) => {
    expect(isValidSlot(slot(startTime, endTime))).toBe(false);
  });

  it('时长输入往返不增加一分钟', () => {
    for (const duration of [1, 15, 30, 60, 120]) {
      const edited = slot(540, endTimeFromDuration(540, duration));
      expect(getSlotDuration(edited)).toBe(duration);
    }
  });

  it('全天及最后一分钟在时间轴上具有正确高度', () => {
    expect(getSlotPosition(slot(0, 1439), 1440)).toEqual({
      top: 0,
      height: 1440,
    });
    expect(getSlotPosition(slot(1439, 1439), 1440)).toEqual({
      top: 1439,
      height: 1,
    });
  });

  it('相邻时段不重叠，共享端点和包含关系均重叠', () => {
    const existing = slot(540, 599, { id: 'existing' });
    expect(hasOverlap([existing], slot(600, 659))).toBe(false);
    expect(hasOverlap([existing], slot(599, 659))).toBe(true);
    expect(hasOverlap([existing], slot(500, 540))).toBe(true);
    expect(hasOverlap([existing], slot(570, 570))).toBe(true);
    expect(hasOverlap([existing], slot(500, 650))).toBe(true);
    expect(hasOverlap([existing], existing)).toBe(false);
    expect(hasOverlap([existing], slot(540, 599, { date: '2026-09-13' }))).toBe(
      false,
    );
  });

  it('编辑排除指定记录后，仍按闭区间检测其他记录', () => {
    const existing = slot(540, 599, { id: 'existing' });
    expect(hasOverlapExcluding([existing], slot(599, 620))).toBe(true);
    expect(hasOverlapExcluding([existing], slot(599, 620), 'existing')).toBe(
      false,
    );
    expect(
      hasOverlapExcluding([existing], slot(599, 620, { date: '2026-09-13' })),
    ).toBe(false);
  });
});

describe('拖拽保持时长并遵守相邻分钟边界', () => {
  const current = slot(600, 659);
  const above = slot(500, 539, { id: 'above' });
  const below = slot(720, 779, { id: 'below' });
  const records = [above, current, below];

  it('移动到上方边界后紧接上一条，保持 60 分钟', () => {
    const moved = moveSlot(records, current, 400);
    expect(moved).toMatchObject({ startTime: 540, endTime: 599 });
    expect(getSlotDuration(moved)).toBe(60);
    expect(hasOverlap(records, moved)).toBe(false);
    expect(current).toMatchObject({ startTime: 600, endTime: 659 });
  });

  it('移动到下方边界后止于下一条前一分钟', () => {
    const moved = moveSlot(records, current, 800);
    expect(moved).toMatchObject({ startTime: 660, endTime: 719 });
    expect(getSlotDuration(moved)).toBe(60);
    expect(hasOverlap(records, moved)).toBe(false);
  });

  it('移动到日界不会缩短时长，不受其他日期记录影响', () => {
    const otherDay = slot(1380, 1439, { id: 'other', date: '2026-09-13' });
    expect(moveSlot([otherDay], current, -100)).toMatchObject({
      startTime: 0,
      endTime: 59,
    });
    expect(moveSlot([otherDay], current, 1440)).toMatchObject({
      startTime: 1380,
      endTime: 1439,
    });
    expect(moveSlot([], slot(1439, 1439), 0)).toMatchObject({
      startTime: 0,
      endTime: 0,
    });
    expect(moveSlot([], slot(0, 1439), 200)).toMatchObject({
      startTime: 0,
      endTime: 1439,
    });
  });

  it('上下缩放都允许恰好 15 分钟', () => {
    const top = resizeSlot(records, current, 'top', 659, 15);
    const bottom = resizeSlot(records, current, 'bottom', 600, 15);
    expect(top).toMatchObject({ startTime: 645, endTime: 659 });
    expect(bottom).toMatchObject({ startTime: 600, endTime: 614 });
    expect(getSlotDuration(top)).toBe(15);
    expect(getSlotDuration(bottom)).toBe(15);
  });

  it('缩放不会占用相邻记录的端点', () => {
    expect(resizeSlot(records, current, 'top', 500, 15)).toMatchObject({
      startTime: 540,
      endTime: 659,
    });
    expect(resizeSlot(records, current, 'bottom', 800, 15)).toMatchObject({
      startTime: 600,
      endTime: 719,
    });
  });

  it('允许单分钟缩放，全天边界不能超出 0–1439', () => {
    expect(resizeSlot([], current, 'top', 700, 1)).toMatchObject({
      startTime: 659,
      endTime: 659,
    });
    expect(resizeSlot([], current, 'bottom', 500, 1)).toMatchObject({
      startTime: 600,
      endTime: 600,
    });
    expect(resizeSlot([], current, 'top', -1, 15).startTime).toBe(0);
    expect(resizeSlot([], current, 'bottom', 1500, 15).endTime).toBe(1439);
  });
});
