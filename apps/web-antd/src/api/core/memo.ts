import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';

export interface Memo {
  id: string;
  title: string;
  content: string;
  hiddenContent: boolean;
  createTime: string;
  updateTime: string;
}

export async function getMemoListApi() {
  // pageSize set to 1000 to retrieve all memos for now, as pagination is not yet implemented in UI
  const res = await getQuery('/memo/query', {
    page: 1,
    pageSize: 1000,
  });
  return res.items;
}

export async function createMemoApi(memo: ApiRequests['MemoCreateReq']) {
  return requestClient.post<boolean>(
    '/memo',
    pickPayload('MemoCreateReq', memo),
  );
}

export async function updateMemoApi(
  memo: ApiRequests['MemoUpdateReq'] & { id?: string },
) {
  return requestClient.put<boolean>(
    `/memo/${memo.id}`,
    pickPayload('MemoUpdateReq', memo),
  );
}

export async function deleteMemoApi(id: string) {
  return requestClient.delete<boolean>(`/memo/${id}`);
}
