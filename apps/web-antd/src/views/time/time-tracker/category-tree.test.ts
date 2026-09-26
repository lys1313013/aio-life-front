import type { TimeSlot, TimeSlotCategory } from './types';

import { describe, expect, it } from 'vitest';

import {
  categoryMatches,
  categoryPath,
  categoryStatistics,
  orderCategoryTree,
} from './category-tree';
import { getSlotDuration } from './utils';

const categories: TimeSlotCategory[] = [
  { id: 'work', name: '工作', parentId: '0', color: '#1890ff', sort: 0 },
  { id: 'coding', name: '开发', parentId: 'work', color: '#389eff', sort: 10 },
  { id: 'meeting', name: '会议', parentId: 'work', color: '#489eff', sort: 20 },
  { id: 'rest', name: '休息', color: '#777777', sort: 30 },
];
const slots: TimeSlot[] = [
  {
    id: '1',
    date: '2026-09-27',
    categoryId: 'work',
    startTime: 0,
    endTime: 59,
  },
  {
    id: '2',
    date: '2026-09-27',
    categoryId: 'coding',
    startTime: 60,
    endTime: 179,
  },
  {
    id: '3',
    date: '2026-09-27',
    categoryId: 'meeting',
    startTime: 180,
    endTime: 239,
  },
  {
    id: '4',
    date: '2026-09-27',
    categoryId: 'rest',
    startTime: 240,
    endTime: 269,
  },
];

describe('时迹两级分类', () => {
  it('一级汇总包含直接记录与所有子级，且不重复', () => {
    const view = categoryStatistics(categories, slots);
    expect(view.categories.map((c) => c.id)).toEqual(['work', 'rest']);
    expect(
      view.timeSlots
        .filter((s) => s.categoryId === 'work')
        .reduce((sum, s) => sum + getSlotDuration(s), 0),
    ).toBe(240);
    expect(view.timeSlots.reduce((sum, s) => sum + getSlotDuration(s), 0)).toBe(
      270,
    );
    expect(slots[1]?.categoryId).toBe('coding');
  });
  it('筛选一级后显示直接记录和子级明细，父子同时选中不重复', () => {
    const view = categoryStatistics(categories, slots, ['work', 'coding']);
    expect(view.timeSlots).toHaveLength(3);
    expect(view.categories.map((c) => c.name)).toEqual([
      '工作（直接记录）',
      '工作 / 开发',
      '工作 / 会议',
    ]);
  });
  it('只选择子级不包含父级直接记录或兄弟分类', () => {
    expect(
      categoryStatistics(categories, slots, ['coding']).timeSlots.map(
        (s) => s.id,
      ),
    ).toEqual(['2']);
    expect(categoryMatches('meeting', ['work'], categories)).toBe(true);
    expect(categoryMatches('work', ['coding'], categories)).toBe(false);
  });
  it('分类移动后按当前树统计历史记录，隐藏不丢失历史', () => {
    const moved = categories.map((c) =>
      c.id === 'coding' ? { ...c, parentId: 'rest', isHidden: true } : c,
    );
    const view = categoryStatistics(moved, slots);
    expect(view.timeSlots.find((s) => s.id === '2')?.categoryId).toBe('rest');
    expect(categoryPath('coding', moved)).toBe('休息 / 开发');
  });
  it('父分类排列在其子分类之前，旧平铺分类和孤立分类仍显示', () => {
    const orphan = {
      id: 'old',
      parentId: 'deleted',
      name: '历史分类',
      color: '#000',
    };
    expect(
      orderCategoryTree([
        categories[2]!,
        categories[3]!,
        categories[0]!,
        categories[1]!,
        orphan,
      ]).map((c) => c.id),
    ).toEqual(['work', 'coding', 'meeting', 'rest', 'old']);
    expect(
      categoryStatistics([...categories, orphan], slots).categories.some(
        (c) => c.id === 'old',
      ),
    ).toBe(true);
  });
});
