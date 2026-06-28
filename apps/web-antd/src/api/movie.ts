import { requestClient } from '#/api/request';

import type { FileVO } from './core/common';

/**
 * 观影记录接口
 */
export namespace MovieApi {
  export interface MovieQuery {
    title?: string;
    type?: number;
    status?: number;
    current?: number;
    size?: number;
  }

  export interface MovieVO {
    id: string;
    title: string;
    type: number;
    director: string;
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

  export interface MovieReq {
    id?: string;
    title: string;
    type: number;
    director?: string;
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
  export function pageList(data: MovieQuery) {
    return requestClient.post('/movie/page', data);
  }

  /**
   * 新增
   */
  export function save(data: MovieReq) {
    return requestClient.post('/movie', data);
  }

  /**
   * 更新
   */
  export function update(data: MovieReq) {
    return requestClient.put('/movie', data);
  }

  /**
   * 删除
   */
  export function remove(id: string) {
    return requestClient.delete(`/movie/${id}`);
  }

  /**
   * 解析豆瓣链接
   */
  export function parseDouban(url: string) {
    return requestClient.get<MovieReq>('/movie/parse-douban', {
      params: { url },
    });
  }

  /**
   * 获取未开始和进行中的数据
   */
  export function listActive() {
    return requestClient.get<MovieVO[]>('/movie/active');
  }

  /**
   * 根据ID获取详情
   */
  export function getById(id: number | string) {
    return requestClient.get<MovieVO>(`/movie/${id}`);
  }

  export const uploadCover = (file: File) => {
    return requestClient.upload<FileVO>('/movie/upload-cover', { file });
  };
}
