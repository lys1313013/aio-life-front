import { requestClient } from '#/api/request';

/**
 * 查询
 */
export async function query(data: any) {
  return await requestClient.post('/expense/query', data);
}

/**
 * 新增
 */
export async function insertData(data: any) {
  return await requestClient.post('/expense', data);
}

/**
 * 修改
 */
export async function updateData(data: any) {
  return await requestClient.put('/expense', data);
}

export async function saveBatch(dataList: any) {
  return await requestClient.post('/expense/saveBatch', dataList);
}

/**
 * 删除
 */
export async function deleteData(data: any) {
  return await requestClient.post('/expense/delete', data);
}

export async function deleteBatch(data: any) {
  return await requestClient.post('/expense/deleteBatch', data);
}

/**
 * 统计
 */
export async function statisticsByYear(data: any) {
  return await requestClient.post('/expense/statisticsByYear', data);
}

export async function statisticsByMonth(data: any) {
  return await requestClient.post('/expense/statisticsByMonth', data);
}
