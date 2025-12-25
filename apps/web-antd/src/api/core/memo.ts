import { requestClient } from "#/api/request";

export interface Memo {
  id: string;
  title: string;
  content: string;
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
  return requestClient.post<boolean>('/memo/save', memo);
}

export async function updateMemoApi(memo: Partial<Memo>) {
  return requestClient.post<boolean>('/memo/update', memo);
}

export async function deleteMemoApi(id: string) {
  return requestClient.post<boolean>('/memo/delete', { id });
}
