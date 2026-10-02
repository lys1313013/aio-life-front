import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

/**
 * 纪念日实体
 */
export interface AnniversaryRecord {
  id?: string;
  title: string;
  targetDate: string; // ISO string, e.g., 'YYYY-MM-DD'
  type: 'anniversary' | 'countdown';
  note?: string;
  color?: string; // gradient color class
  icon?: string; // Emoji
}

/**
 * 获取所有纪念日
 */
export async function getAnniversaryRecords() {
  return requestClient.get<AnniversaryRecord[]>('/anniversaryRecords');
}

/**
 * 创建纪念日
 */
export async function createAnniversaryRecord(
  data: ApiRequests['AnniversaryRecordCreateReq'],
) {
  return requestClient.post<AnniversaryRecord>(
    '/anniversaryRecords',
    pickPayload('AnniversaryRecordCreateReq', data),
  );
}

/**
 * 更新纪念日
 */
export async function updateAnniversaryRecord(
  data: ApiRequests['AnniversaryRecordUpdateReq'],
) {
  return requestClient.put<AnniversaryRecord>(
    '/anniversaryRecords',
    pickPayload('AnniversaryRecordUpdateReq', data),
  );
}

/**
 * 删除纪念日
 */
export async function deleteAnniversaryRecords(idList: string[]) {
  return requestClient.post<void>(`/anniversaryRecords/batchDelete`, {
    idList,
  });
}
