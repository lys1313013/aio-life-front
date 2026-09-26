import type { TimeSlot, TimeSlotCategory } from './types';

interface CategoryNode {
  id?: string;
  parentId?: null | string;
  name: string;
  sort?: number;
}

export function isRootCategory(category: { parentId?: null | string }) {
  return !category.parentId || category.parentId === '0';
}

export function categoryPath(id: string, categories: CategoryNode[]): string {
  const category = categories.find((item) => item.id === id);
  if (!category) return '未知';
  const parent = categories.find((item) => item.id === category.parentId);
  return parent ? `${parent.name} / ${category.name}` : category.name;
}

/** 一级筛选包含自身和二级；通过集合去重，父子同时勾选不会重复计时。 */
export function categoryMatches(
  id: string,
  selected: string[],
  categories: CategoryNode[],
) {
  if (selected.length === 0) return true;
  const category = categories.find((item) => item.id === id);
  return (
    selected.includes(id) ||
    (!!category?.parentId && selected.includes(category.parentId))
  );
}

export function orderCategoryTree<T extends CategoryNode>(
  categories: T[],
): T[] {
  const sorted = [...categories].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const roots = sorted.filter((category) => isRootCategory(category));
  const result = roots.flatMap((root) => [
    root,
    ...sorted.filter((c) => c.parentId === root.id),
  ]);
  // 历史异常/已删除上级的分类仍可显示，不能静默丢失记录。
  return [...result, ...sorted.filter((c) => !result.includes(c))];
}

/** 默认按一级汇总；选择分类后展示对应明细，父级直接记录单独展示。 */
export function categoryStatistics<T extends TimeSlotCategory>(
  categories: T[],
  slots: TimeSlot[],
  selected: null | string[] = [],
): { categories: T[]; timeSlots: TimeSlot[] } {
  const selection = selected ?? [];
  const detailed = selection.length > 0;
  const idSet = new Set(categories.map((c) => c.id));
  const projected = slots
    .filter((slot) => categoryMatches(slot.categoryId, selection, categories))
    .map((slot) => {
      const category = categories.find((c) => c.id === slot.categoryId);
      const parentId = category?.parentId;
      return {
        ...slot,
        categoryId:
          !detailed && parentId && idSet.has(parentId)
            ? parentId
            : slot.categoryId,
      };
    });
  const visible = categories.filter((c) =>
    detailed
      ? categoryMatches(c.id, selection, categories)
      : isRootCategory(c) || !idSet.has(c.parentId!),
  );
  return {
    categories: visible.map((c) => ({
      ...c,
      name: detailed
        ? `${categoryPath(c.id, categories)}${categories.some((child) => child.parentId === c.id) ? '（直接记录）' : ''}`
        : c.name,
    })),
    timeSlots: projected,
  };
}
