/** 公共分页上限；需要完整列表的选择器与看板逐页读取，不能用超大 pageSize。 */
export const MAX_PAGE_SIZE = 200;

export interface PageResult<T> {
  items: T[];
  total: null | number;
}

export async function fetchAllPages<T>(
  fetchPage: (params: {
    page: number;
    pageSize: number;
  }) => Promise<PageResult<T>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page += 1) {
    const result = await fetchPage({ page, pageSize: MAX_PAGE_SIZE });
    items.push(...result.items);
    if (
      result.items.length < MAX_PAGE_SIZE ||
      (result.total !== null && items.length >= result.total)
    ) {
      return items;
    }
  }
}
