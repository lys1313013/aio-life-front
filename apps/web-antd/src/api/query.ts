import { requestClient } from './request';

/** 将原分页条件平铺到 URL；GET 不发送请求体，数组使用重复参数。 */
export function getQuery<T = any>(
  url: string,
  data?: null | Record<string, any>,
): Promise<T> {
  const { condition, ...pagination } = data ?? {};
  const params = Object.fromEntries(
    Object.entries({ ...condition, ...pagination }).filter(
      ([, value]) => value !== null && value !== undefined,
    ),
  );
  return requestClient.get<T>(url, { params, paramsSerializer: 'repeat' });
}
