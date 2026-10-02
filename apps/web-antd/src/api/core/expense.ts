import type { ApiRequests } from '#/api/payload';

import { pickPayload, pickPayloadList } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await getQuery('/expense/query', data);
}

/**
 * 新增
 */
export async function insertData(data: ApiRequests['ExpenseCreateReq']) {
  return await requestClient.post(
    '/expense',
    pickPayload('ExpenseCreateReq', data),
  );
}

/**
 * 修改
 */
export async function updateData(data: ApiRequests['ExpenseUpdateReq']) {
  return await requestClient.put(
    '/expense',
    pickPayload('ExpenseUpdateReq', data),
  );
}

export async function saveBatch(dataList: ApiRequests['ExpenseCreateReq'][]) {
  return await requestClient.post(
    '/expense/saveBatch',
    pickPayloadList('ExpenseCreateReq', dataList),
  );
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.delete(`/expense/${data.id}`);
}

export async function deleteBatch(data: ApiRequests['CommonReq']) {
  return await requestClient.post(
    '/expense/deleteBatch',
    pickPayload('CommonReq', data),
  );
}

/**
 * 统计
 */
export async function statisticsByYear(data: any) {
  return await getQuery('/expense/statisticsByYear', data);
}

export async function statisticsByMonth(data: any) {
  return await getQuery('/expense/statisticsByMonth', data);
}
