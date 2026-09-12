import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/income/query', data);
}

/**
 * 新增
 */
export async function add(data: any) {
  return await requestClient.post('/income', data);
}

/**
 * 更新
 */
export async function update(incomeId: number | string, data: any) {
  return await requestClient.put(`/income/${incomeId}`, data);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/income/${data.incomeId}`);
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
