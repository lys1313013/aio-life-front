import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

/**
 * 纪念日实体
 */
export interface AnniversaryRecord {
  id?: string;
  isPinned?: 0 | 1;
  pinnedSort?: number;
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
export async function getAnniversaryRecords(params?: { isPinned?: 0 | 1 }) {
  return requestClient.get<AnniversaryRecord[]>('/anniversaryRecords', {
    params,
  });
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

export async function setAnniversaryPinned(id: string, isPinned: 0 | 1) {
  return requestClient.put<AnniversaryRecord>(
    `/anniversaryRecords/${id}/pin`,
    pickPayload('HomePinReq', { isPinned }),
  );
}

export async function updateAnniversaryPinnedOrder(ids: string[]) {
  return requestClient.put<void>(
    '/anniversaryRecords/pinned-order',
    pickPayload('HomePinnedOrderReq', { ids }),
  );
}
