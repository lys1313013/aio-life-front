import type { ApiRequests } from '#/api/payload';

import { fetchAllPages } from '#/api/pagination';
import { pickPayload } from '#/api/payload';
import { getQuery } from '#/api/query';
import { requestClient } from '#/api/request';
import { afterHomeSectionWrite } from '#/utils/home-section-change';

export interface Memo {
  id: string;
  title: string;
  content: string;
  hiddenContent: boolean;
  createTime: string;
  updateTime: string;
}

export async function getMemoListApi() {
  return fetchAllPages<Memo>((params) => getQuery('/memo/query', params));
}

export async function getMemoApi(id: string) {
  return requestClient.get<Memo>(`/memo/${id}`);
}

export async function createMemoApi(memo: ApiRequests['MemoCreateReq']) {
  return afterHomeSectionWrite(
    'memo',
    requestClient.post<boolean>('/memo', pickPayload('MemoCreateReq', memo)),
  );
}

export async function updateMemoApi(
  memo: ApiRequests['MemoUpdateReq'] & { id: string },
) {
  return afterHomeSectionWrite(
    'memo',
    requestClient.put<boolean>(
      `/memo/${memo.id}`,
      pickPayload('MemoUpdateReq', memo),
    ),
  );
}

export async function deleteMemoApi(id: string) {
  return afterHomeSectionWrite(
    'memo',
    requestClient.delete<boolean>(`/memo/${id}`),
  );
}
