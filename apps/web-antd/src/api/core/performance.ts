import type { FileVO } from './common';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

export interface PerformanceEntity {
  id?: string;
  performanceName?: string;
  performer?: string;
  performanceType?: string;
  performanceDate?: string;
  city?: string;
  venue?: string;
  ticketPrice?: string;
  fileIds?: string[];
  files?: FileVO[];
}

/**
 * 分页查询
 */
export async function queryPerformances(params: {
  page: number;
  pageSize: number;
}) {
  return await requestClient.get('/performance', { params });
}

/**
 * 新增
 */
export async function createPerformance(
  data: ApiRequests['PerformanceCreateReq'],
) {
  return await requestClient.post(
    '/performance',
    pickPayload('PerformanceCreateReq', data),
  );
}

/**
 * 更新
 */
export async function updatePerformance(
  data: ApiRequests['PerformanceUpdateReq'],
) {
  return await requestClient.put(
    '/performance',
    pickPayload('PerformanceUpdateReq', data),
  );
}

/**
 * 删除
 */
export async function deletePerformance(id: string) {
  return await requestClient.delete(`/performance/${id}`);
}

/**
 * 上传演出封面/票根图片
 */
export async function uploadPerformanceAttachment(file: File) {
  return await uploadFile(file, FILE_BIZ_TYPE.PERFORMANCE);
}
