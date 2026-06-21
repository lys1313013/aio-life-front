import { post } from "../utils/request";

export interface Memo {
  id: string;
  title: string;
  content: string;
  hiddenContent: boolean;
  createTime: string;
  updateTime: string;
}

export function getMemoListApi() {
  return post<any>("/memo/query", {
    page: 1,
    pageSize: 1000,
  }).then(res => res.items || []);
}

export function createMemoApi(memo: Partial<Memo>) {
  return post<boolean>("/memo/save", memo);
}

export function updateMemoApi(memo: Partial<Memo>) {
  return post<boolean>("/memo/update", memo);
}

export function deleteMemoApi(id: string) {
  return post<boolean>("/memo/delete", { id });
}
