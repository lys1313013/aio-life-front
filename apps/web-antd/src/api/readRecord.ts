import type { FileVO } from './core/common';

import { requestClient } from '#/api/request';

/**
 * 阅读记录接口
 */
export namespace ReadRecordApi {
  export interface ReadRecordQuery {
    title?: string;
    type?: number;
    status?: number;
    activeOnly?: boolean;
    current?: number;
    size?: number;
  }

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
    coverImgUrl?: string;
    status?: number;
    totalProgress?: number;
    currentProgress?: number;
    startTime?: string;
    finishTime?: string;
    remark?: string;
  }

  /**
   * 分页查询
   */
  export function pageList(data: ReadRecordQuery) {
    return requestClient.post<{ records: ReadRecordVO[]; total: number }>(
      '/read-record/page',
      data,
    );
  }

  /**
   * 新增
   */
  export function save(data: ReadRecordReq) {
    return requestClient.post('/read-record', data);
  }

  /**
   * 更新
   */
  export function update(data: ReadRecordReq) {
    return requestClient.put('/read-record', data);
  }

  /**
   * 删除
   */
  export function remove(id: string) {
    return requestClient.delete(`/read-record/${id}`);
  }

  /**
   * 解析豆瓣链接
   */
  export function parseDouban(url: string) {
    return requestClient.get<ReadRecordReq>('/read-record/parse-douban', {
      params: { url },
    });
  }

  /**
   * 获取未开始和进行中的数据
   */
  export function listActive() {
    return requestClient.get<ReadRecordVO[]>('/read-record/active');
  }

  /**
   * 根据ID获取详情
   */
  export function getById(id: number | string) {
    return requestClient.get<ReadRecordVO>(`/read-record/${id}`);
  }

  export const uploadCover = (file: File) => {
    return requestClient.upload<FileVO>('/read-record/upload-cover', { file });
  };
}
