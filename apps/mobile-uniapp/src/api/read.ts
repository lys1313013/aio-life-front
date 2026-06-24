import { get, post, request } from "../utils/request";

export interface ReadRecordVO {
  id: string;
  title: string;
  type: number;
  author: string;
  url: string;
  fileId: string;
  coverImgUrl: string;
  status: number;
  totalProgress: number;
  currentProgress: number;
  startTime: string;
  finishTime: string;
  remark: string;
  createTime: string;
  updateTime: string;
}

export interface ReadRecordReq {
  id?: string;
  title: string;
  type: number;
  author?: string;
  url?: string;
  fileId?: string;
  status?: number;
  totalProgress?: number;
  currentProgress?: number;
  startTime?: string;
  finishTime?: string;
  remark?: string;
}

export function getReadListApi(data: any) {
  return post<any>('/read-record/page', data);
}

export function saveReadApi(data: any) {
  return post<any>('/read-record', data);
}

export function updateReadApi(data: any) {
  return request<any>({ url: '/read-record', method: 'PUT', data });
}

export function removeReadApi(id: string) {
  return request<any>({ url: `/read-record/${id}`, method: 'DELETE' });
}

export function listActiveRead() {
  return get<ReadRecordVO[]>('/read-record/active');
}
