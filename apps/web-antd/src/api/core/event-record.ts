import type { FileVO } from './common';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

export interface EventRecordEntity {
  id?: string;
  title?: string;
  participants?: string;
  eventType?: string;
  eventDate?: string;
  city?: string;
  venue?: string;
  ticketPrice?: string;
  fileIds?: string[];
  files?: FileVO[];
}

/**
 * 分页查询
 */
export async function queryEventRecords(params: {
  page: number;
  pageSize: number;
}) {
  return await requestClient.get('/event-records', { params });
}

/**
 * 新增
 */
export async function createEventRecord(
  data: ApiRequests['EventRecordCreateReq'],
) {
  return await requestClient.post(
    '/event-records',
    pickPayload('EventRecordCreateReq', data),
  );
}

/**
 * 更新
 */
export async function updateEventRecord(
  data: ApiRequests['EventRecordUpdateReq'],
) {
  return await requestClient.put(
    '/event-records',
    pickPayload('EventRecordUpdateReq', data),
  );
}

/**
 * 删除
 */
export async function deleteEventRecord(id: string) {
  return await requestClient.delete(`/event-records/${id}`);
}

/**
 * 上传活动封面/票根图片
 */
export async function uploadEventRecordAttachment(file: File) {
  return await uploadFile(file, FILE_BIZ_TYPE.EVENT_RECORD);
}
