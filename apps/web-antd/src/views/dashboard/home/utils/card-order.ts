import type { HomeCardPreference } from '#/api/core/home-cards';

/** Only replace visible slots; disabled and unavailable cards keep their places. */
export function mergeVisibleCardOrder(
  items: HomeCardPreference[],
  group: string,
  visibleKeys: string[],
): string[] {
  const keys = items
    .filter((item) => item.group === group)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.cardKey);
  const visible = new Set(visibleKeys);
  if (
    visible.size !== visibleKeys.length ||
    visibleKeys.some((key) => !keys.includes(key))
  ) {
    throw new Error('卡片列表已变化，请重试');
  }
  let index = 0;
  return keys.map((key) => (visible.has(key) ? visibleKeys[index++]! : key));
}
