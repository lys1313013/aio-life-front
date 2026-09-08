import type { ProgressStatus } from './core/progress-status';

import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './core/common';

/**
 * 观影记录接口
 */
export namespace MovieApi {
  export interface MovieQuery {
    title?: string;
    type?: number;
    status?: ProgressStatus;
    statuses?: ProgressStatus[];
    activeOnly?: boolean;
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
    status: ProgressStatus;
    totalProgress: number;
    currentProgress: number;
    startTime: string;
    finishTime: string;
    rating?: number;
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
    status?: ProgressStatus;
    totalProgress?: number;
    currentProgress?: number;
    startTime?: string;
    finishTime?: string;
    rating?: number;
    remark?: string;
  }

  export type DoubanMovieType =
    | 'animation'
    | 'documentary'
    | 'movie'
    | 'other'
    | 'series';

  export interface DoubanImportRecord {
    rowNumber: number;
    doubanSubjectId: string;
    title: string;
    type: DoubanMovieType;
    director?: string;
    url: string;
    status: ProgressStatus;
    markedDate?: string;
    rating?: number;
    remark?: string;
  }

  export interface DoubanImportRequest {
    format: string;
    version: number;
    source: string;
    doubanUserId: string;
    duplicatePolicy?: 'overwrite' | 'skip';
    records: DoubanImportRecord[];
  }

  export interface DoubanImportPreview {
    total: number;
    newCount: number;
    duplicateCount: number;
    errorCount: number;
    duplicates: Array<{
      doubanSubjectId: string;
      existingId: string;
      existingTitle: string;
      rowNumber: number;
      title: string;
    }>;
    errors: Array<{ message: string; rowNumber: number }>;
  }

  export interface DoubanImportResult {
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
  }

  /**
   * 分页查询
   */
  export function pageList(data: MovieQuery) {
    return requestClient.post<{ records: MovieVO[]; total: number }>(
      '/movie/page',
      data,
    );
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

  export function previewDoubanImport(data: DoubanImportRequest) {
    return requestClient.post<DoubanImportPreview>(
      '/movie/import/douban/preview',
      data,
    );
  }

  export function importDouban(data: DoubanImportRequest) {
    return requestClient.post<DoubanImportResult>('/movie/import/douban', data);
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
    return uploadFile(file, FILE_BIZ_TYPE.MOVIE);
  };
}
