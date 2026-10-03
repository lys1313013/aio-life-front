import type { BankOption } from './index';

import type { ApiRequests } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface CoverOption {
  id: string;
  name: string;
  fileId: string;
}
export interface CoverTemplate extends CoverOption {
  bankId: string;
  bankName: string;
  cardType: 'credit' | 'debit';
  sourceUrl: null | string;
  isEnabled: number;
  sortOrder: number;
  // 后端 long 序列化为字符串，同时兼容数字响应。
  usageCount: number | string;
}
const path = '/system/bank-card-covers';
export interface CoverTemplateQuery {
  page: number;
  size: number;
  keyword?: string;
  bankId?: string;
  cardType?: string;
  isEnabled?: number;
}
export interface CoverTemplatePage {
  items: CoverTemplate[];
  total: string;
}
export const listCoverTemplates = (params: CoverTemplateQuery) =>
  requestClient.get<CoverTemplatePage>(`${path}/page`, { params });
export const listCoverBanks = () =>
  requestClient.get<BankOption[]>(`${path}/banks`);
export const listCoverOptions = (bankId: string, cardType: string) =>
  requestClient.get<CoverOption[]>('/bank-cards/cover-templates', {
    params: { bankId, cardType },
  });
export const saveCoverTemplate = (
  data: ApiRequests['BankCardCoverTemplateReq'],
  id?: string,
) =>
  id
    ? requestClient.put<CoverTemplate>(
        `${path}/${id}`,
        pickPayload('BankCardCoverTemplateReq', data),
      )
    : requestClient.post<CoverTemplate>(
        path,
        pickPayload('BankCardCoverTemplateReq', data),
      );
export const setCoverEnabled = (id: string, isEnabled: number) =>
  requestClient.put<CoverTemplate>(`${path}/${id}/enabled`, { isEnabled });
export const deleteCoverTemplate = (id: string) =>
  requestClient.delete(`${path}/${id}`);
export const uploadTemplateCover = (file: File) =>
  requestClient.upload<{ id: string }>(`${path}/upload`, { file });
