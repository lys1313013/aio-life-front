import { get } from './request';

/** 平铺分页筛选条件，并在 H5 / 小程序 / App 中统一数组参数的编码。 */
export function getQuery<T = any>(
  url: string,
  data?: null | Record<string, any>,
): Promise<T> {
  const { condition, ...pagination } = data ?? {};
  const params = { ...condition, ...pagination };
  const query = Object.entries(params)
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values
        .filter((item) => item !== null && item !== undefined)
        .map(
          (item) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`,
        );
    })
    .join('&');
  return get<T>(query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url);
}
