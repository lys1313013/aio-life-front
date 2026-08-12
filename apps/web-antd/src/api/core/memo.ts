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
  const res = await requestClient.post('/memo/query', {
    page: 1,
    pageSize: 1000,
  });
  return res.items;
}

export async function createMemoApi(memo: Partial<Memo>) {
  return requestClient.post<boolean>('/memo', memo);
}

export async function updateMemoApi(memo: Partial<Memo>) {
  return requestClient.put<boolean>(`/memo/${memo.id}`, memo);
}

export async function deleteMemoApi(id: string) {
  return requestClient.delete<boolean>(`/memo/${id}`);
}
