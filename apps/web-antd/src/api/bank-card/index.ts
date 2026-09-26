import { requestClient } from '#/api/request';

export interface BankOption {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
}
export interface CardTag {
  id: string;
  name: string;
  color: null | string;
  status: string;
}
export interface BankCard {
  id: string;
  bankId: null | string;
  customBankName: null | string;
  bankName: string;
  bankCode: string;
  cardName: null | string;
  alias: null | string;
  cardType: 'credit' | 'debit';
  cardNoLast4: string;
  branchName: null | string;
  status: 'closed' | 'frozen' | 'lost' | 'normal';
  openedDate: null | string;
  expiryMonth: null | string;
  creditLimit: null | number | string;
  statementDay: null | number;
  repaymentDay: null | number;
  coverColor: null | string;
  coverSourceUrl: null | string;
  sortOrder: number;
  remark: null | string;
  tags: CardTag[];
  coverFileIds: string[];
}
export type BankCardInput = Omit<
  BankCard,
  'bankCode' | 'bankName' | 'cardNoLast4' | 'id' | 'tags'
> & { cardNo?: string; tagIds: string[] };
export const listCards = () => requestClient.get<BankCard[]>('/bank-cards');
export const listBanks = () =>
  requestClient.get<BankOption[]>('/bank-cards/banks');
export const listTags = () => requestClient.get<CardTag[]>('/bank-cards/tags');
export const saveCard = (data: BankCardInput, id?: string) =>
  id
    ? requestClient.put<BankCard>(`/bank-cards/${id}`, data)
    : requestClient.post<BankCard>('/bank-cards', data);
export const deleteCard = (id: string) =>
  requestClient.delete(`/bank-cards/${id}`);
export const revealNumber = (id: string) =>
  requestClient.post<string>(`/bank-cards/${id}/number`);
export const saveTag = (data: Omit<CardTag, 'id'>, id?: string) =>
  id
    ? requestClient.put<CardTag>(`/bank-cards/tags/${id}`, data)
    : requestClient.post<CardTag>('/bank-cards/tags', data);
export const deleteTag = (id: string) =>
  requestClient.delete(`/bank-cards/tags/${id}`);
export const uploadCover = (file: File) =>
  requestClient.upload<{ id: string }>('/file/upload', {
    file,
    bizType: 'bank_card_cover',
  });
