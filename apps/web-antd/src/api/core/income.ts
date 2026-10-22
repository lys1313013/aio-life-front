import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';
import { afterHomeSectionWrite } from '#/utils/home-section-change';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/income/query', data);
}

/**
 * 新增
 */
export async function add(data: ApiRequests['IncomeCreateReq']) {
  return afterHomeSectionWrite(
    'income',
    requestClient.post('/income', pickPayload('IncomeCreateReq', data)),
  );
}

/**
 * 更新
 */
export async function update(
  incomeId: string,
  data: ApiRequests['IncomeUpdateReq'],
) {
  return afterHomeSectionWrite(
    'income',
    requestClient.put(
      `/income/${incomeId}`,
      pickPayload('IncomeUpdateReq', data),
    ),
  );
}

/**
 * 删除
 */
export async function deleteData(incomeId: string) {
  return afterHomeSectionWrite(
    'income',
    requestClient.delete(`/income/${incomeId}`),
  );
}

/**
 * 统计
 */
export async function statisticsByYear(data: any) {
  return await getQuery('/income/statisticsByYear', data);
}

export async function statisticsByMonth(data: any) {
  return await getQuery('/income/statisticsByMonth', data);
}
