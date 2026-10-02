import type { FileVO } from './common';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

import { FILE_BIZ_TYPE, uploadFile } from './common';

/**
 * 荣誉记录实体
 */
export interface HonorRecordEntity {
  id?: string;
  title: string;
  description?: string;
  honorDate: string;
  issuer?: string;
  level?: string;
  categoryId?: string;
  customCategory?: string;
  tags?: string;
  fileIds?: string[];
  files?: FileVO[];
  isTop?: number;
  isPublic?: number;
  sortOrder?: number;
}

/**
 * 荣誉分类实体
 */
export interface HonorCategoryEntity {
  id?: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

/**
 * 查询荣誉记录列表
 */
export async function queryHonorRecords() {
  return await requestClient.get<HonorRecordEntity[]>('/honorRecords');
}

/**
 * 获取单个荣誉记录
 */
export async function getHonorRecord(id: string) {
  return await requestClient.get<HonorRecordEntity>(`/honorRecords/${id}`);
}

/**
 * 创建荣誉记录
 */
export async function createHonorRecord(
  data: ApiRequests['HonorRecordCreateReq'],
) {
  return await requestClient.post<HonorRecordEntity>(
    '/honorRecords',
    pickPayload('HonorRecordCreateReq', data),
  );
}

/**
 * 更新荣誉记录
 */
export async function updateHonorRecord(
  data: ApiRequests['HonorRecordUpdateReq'],
) {
  return await requestClient.put<HonorRecordEntity>(
    '/honorRecords',
    pickPayload('HonorRecordUpdateReq', data),
  );
}

/**
 * 批量删除荣誉记录
 */
export async function deleteHonorRecords(idList: string[]) {
  return await requestClient.post<void>(
    '/honorRecords/batchDelete',
    pickPayload('CommonReq', {
      idList,
    }),
  );
}

/**
 * 切换置顶状态
 */
export async function toggleHonorTop(id: string) {
  return await requestClient.post<void>(`/honorRecords/toggleTop/${id}`);
}

/**
 * 查询荣誉分类列表
 */
export async function queryHonorCategories() {
  return await requestClient.get<HonorCategoryEntity[]>('/honorCategories');
}

/**
 * 上传附件
 */
export async function uploadHonorAttachment(file: File) {
  return await uploadFile(file, FILE_BIZ_TYPE.HONOR_RECORD);
}
