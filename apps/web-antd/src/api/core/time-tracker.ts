import { requestClient } from '#/api/request';

/**
 * 时间记录实体接口
 */
export interface TimeRecordEntity {
  userId: number;
  categoryId: string;
  date: string;
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  duration: number;
  isManual: number;
  id: string;
  createUser: number;
  createTime: string;
  updateTime: string;
  exerciseTypeId?: string;
  exerciseCount?: number;
}

/**
 * 查询响应数据接口
 */
export interface QueryResponse {
  items: TimeRecordEntity[];
  total: number;
}

/**
 * 查询数据
 */
export async function query(data: any): Promise<QueryResponse> {
  return await requestClient.post('/timeRecord/query', data);
}

/**
 * 查询数据
 */
export async function queryForWeek(data: any): Promise<TimeRecordEntity[]> {
  return await requestClient.post('/timeRecord/queryForWeek', data);
}

/**
 * 更新数据
 */
export async function update(data: Partial<TimeRecordEntity>): Promise<void> {
  return await requestClient.post('/timeRecord/update', data);
}

/**
 * 保存数据
 */
export async function save(data: Partial<TimeRecordEntity>): Promise<boolean> {
  return await requestClient.post('/timeRecord/save', data);
}

/**
 * 删除数据
 */
export async function deleteData(data: { id: string }): Promise<void> {
  return await requestClient.post('/timeRecord/delete', data);
}

/**
 * 删除数据
 */
export async function deleteByDate(data: { date: string }): Promise<void> {
  return await requestClient.post('/timeRecord/deleteByDate', data);
}

/**
 * 获取推荐分类
 */
export async function recommendType(params: {
  date: string;
  time: number;
}): Promise<string> {
  return await requestClient.get('/timeRecord/recommendType', { params });
}

/**
 * 获取推荐分类
 */
export async function recommendNext(params: { date: string }): Promise<{
  categoryId: string;
  date: string;
  endTime: number;
  startTime: number;
}> {
  return await requestClient.get('/timeRecord/recommendNext', { params });
}
