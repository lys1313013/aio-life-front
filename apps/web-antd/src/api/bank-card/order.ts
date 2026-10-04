import { requestClient } from '#/api/request';

export interface CardMove {
  id: string;
  targetId: string;
  after: boolean;
}
export interface CardOrder {
  id: string;
  sortOrder: number;
}
export async function moveBankCard(data: CardMove) {
  return await requestClient.put<CardOrder[]>('/bank-cards/order', data);
}
export async function moveBankCardCover(data: CardMove) {
  return await requestClient.put<CardOrder[]>(
    '/system/bank-card-covers/order',
    data,
  );
}
